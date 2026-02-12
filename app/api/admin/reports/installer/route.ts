import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Installer report by date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const installerId = searchParams.get('installer_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const format = searchParams.get('format') || 'json'; // json or csv

    if (!installerId || !from || !to) {
      return NextResponse.json(
        { error: 'installer_id, from, and to are required' },
        { status: 400 }
      );
    }

    // Get installer profile
    const { data: installer } = await supabaseAdmin
      .from('user_profiles')
      .select('first_name, last_name, installer_type, hourly_rate')
      .eq('id', installerId)
      .single();

    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
    }

    // Get completed bookings for this installer in date range
    const { data: assignments } = await supabaseAdmin
      .from('booking_installers')
      .select(`
        is_lead, actual_hours, debitable_hours,
        bookings!inner (
          id, scheduled_date, status, num_installers,
          quote_requests (
            customer_name, customer_address,
            calculation_data, adjusted_data
          )
        )
      `)
      .eq('installer_id', installerId)
      .eq('status', 'accepted');

    // Filter by date range and completed status
    const filteredAssignments = (assignments || []).filter((a) => {
      const booking = a.bookings as unknown as {
        scheduled_date: string;
        status: string;
      };
      return (
        booking.scheduled_date >= from &&
        booking.scheduled_date <= to &&
        booking.status === 'completed'
      );
    });

    // Calculate hours for each booking
    const reportRows = filteredAssignments.map((a) => {
      const booking = a.bookings as unknown as {
        id: number;
        scheduled_date: string;
        num_installers: number;
        quote_requests: {
          customer_name: string;
          customer_address: string;
          calculation_data: string | Record<string, unknown>;
          adjusted_data: string | Record<string, unknown> | null;
        } | null;
      };

      const quoteData = booking.quote_requests;
      const calcData = quoteData?.adjusted_data || quoteData?.calculation_data;
      let totalHours = 0;

      if (calcData) {
        const parsed = typeof calcData === 'string' ? JSON.parse(calcData) : calcData;
        totalHours = parsed?.totals?.totalHours || 0;
      }

      // Use debitable_hours if set (overbooking scenario), else actual_hours, else calculated
      const calculatedHours = totalHours / Math.max(booking.num_installers || 2, 1);
      const actualHours = a.actual_hours ?? calculatedHours;
      const debitableHours = a.debitable_hours ?? calculatedHours;
      const rate = installer.hourly_rate || 0;
      const amount = debitableHours * rate;

      return {
        date: booking.scheduled_date,
        booking_id: booking.id,
        customer_name: quoteData?.customer_name || '-',
        customer_address: quoteData?.customer_address || '-',
        hours: Math.round(calculatedHours * 10) / 10,
        actual_hours: a.actual_hours != null ? Math.round(actualHours * 10) / 10 : null,
        debitable_hours: a.debitable_hours != null ? Math.round(debitableHours * 10) / 10 : null,
        rate,
        amount: Math.round(amount),
        is_lead: a.is_lead,
      };
    });

    // Sort by date
    reportRows.sort((a, b) => a.date.localeCompare(b.date));

    const totalHours = reportRows.reduce((sum, r) => sum + r.hours, 0);
    const totalAmount = reportRows.reduce((sum, r) => sum + r.amount, 0);
    const installerName = `${installer.first_name || ''} ${installer.last_name || ''}`.trim();

    if (format === 'csv') {
      const isSubcontractor = installer.installer_type === 'subcontractor';

      let csv = '';
      if (isSubcontractor) {
        csv = 'Datum,Kund,Adress,Timmar,Timpris,Belopp exkl moms\n';
        reportRows.forEach((r) => {
          csv += `${r.date},"${r.customer_name}","${r.customer_address}",${r.hours},${r.rate},${r.amount}\n`;
        });
        csv += `\nTotalt,,,${totalHours},,${totalAmount}\n`;
        csv += `Moms (25%),,,,,"${Math.round(totalAmount * 0.25)}"\n`;
        csv += `Totalt inkl moms,,,,,"${Math.round(totalAmount * 1.25)}"\n`;
      } else {
        csv = 'Datum,Kund,Adress,Timmar\n';
        reportRows.forEach((r) => {
          csv += `${r.date},"${r.customer_name}","${r.customer_address}",${r.hours}\n`;
        });
        csv += `\nTotalt,,,${totalHours}\n`;
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="rapport-${installerName}-${from}-${to}.csv"`,
        },
      });
    }

    return NextResponse.json({
      installer: {
        id: installerId,
        name: installerName,
        type: installer.installer_type,
        hourly_rate: installer.hourly_rate,
      },
      period: { from, to },
      rows: reportRows,
      totals: {
        hours: Math.round(totalHours * 10) / 10,
        amount: Math.round(totalAmount),
        amount_incl_vat: Math.round(totalAmount * 1.25),
      },
    });
  } catch (err) {
    console.error('Report GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
