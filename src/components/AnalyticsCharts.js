'use client';

export default function AnalyticsCharts({ analytics }) {
  if (!analytics || analytics.totalRecords === 0) {
    return (
      <div style={{ background: 'var(--input-bg)', padding: '30px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-color)', margin: '20px 0' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          No attendance records available for real-time graph calculation yet. Mark attendance to generate live charts!
        </p>
      </div>
    );
  }

  const { totalRecords, totalPresent, totalAbsent, totalLate, overallRate, dailyTrends, classPerformance } = analytics;

  // Calculate Doughnut Chart SVG ring strokes
  const presentPct = Math.round((totalPresent / totalRecords) * 100);
  const absentPct = Math.round((totalAbsent / totalRecords) * 100);
  const latePct = Math.round((totalLate / totalRecords) * 100);

  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const presentStroke = (presentPct / 100) * circumference;
  const lateStroke = (latePct / 100) * circumference;
  const absentStroke = (absentPct / 100) * circumference;

  const presentOffset = 0;
  const lateOffset = -presentStroke;
  const absentOffset = -(presentStroke + lateStroke);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
      
      {/* CHART 1: Attendance Breakdown Doughnut Ring */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
            Attendance Breakdown
          </h3>
          <span style={{ fontSize: '13px', background: 'rgba(0, 243, 255, 0.15)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '12px', fontWeight: '700' }}>
            {totalRecords} Total Records
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px', padding: '10px 0' }}>
          {/* SVG Doughnut Ring */}
          <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background Track */}
              <circle cx="80" cy="80" r={radius} stroke="rgba(255, 255, 255, 0.08)" strokeWidth="18" fill="none" />
              
              {/* Present Ring Segment */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#2bd49e"
                strokeWidth="18"
                fill="none"
                strokeDasharray={`${presentStroke} ${circumference}`}
                strokeDashoffset={presentOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />

              {/* Late Ring Segment */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#ffb703"
                strokeWidth="18"
                fill="none"
                strokeDasharray={`${lateStroke} ${circumference}`}
                strokeDashoffset={lateOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />

              {/* Absent Ring Segment */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#ff4d4d"
                strokeWidth="18"
                fill="none"
                strokeDasharray={`${absentStroke} ${circumference}`}
                strokeDashoffset={absentOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            </svg>

            {/* Center Percentage Display */}
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary-color)', lineHeight: 1 }}>
                {overallRate}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>
                Attendance
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2bd49e' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>Present: {totalPresent} ({presentPct}%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffb703' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>Late: {totalLate} ({latePct}%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff4d4d' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>Absent: {totalAbsent} ({absentPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHART 2: Weekly Trends Stacked Bar Chart */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
            7-Day Attendance Trend
          </h3>
          {/* Stacked legend */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {[['#2bd49e', 'Present'], ['#ffb703', 'Late'], ['#ff4d4d', 'Absent']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, display: 'inline-block' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {dailyTrends.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>No daily trend data available</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', paddingTop: '10px', borderBottom: '1px solid var(--border-color)', gap: '6px' }}>
            {dailyTrends.map((d, idx) => {
              const maxVal = Math.max(...dailyTrends.map(t => t.total), 1);
              const colHeightPx = Math.max(Math.round((d.total / maxVal) * 130), 16);
              const presentPx = d.total > 0 ? Math.round((d.present / d.total) * colHeightPx) : 0;
              const latePx    = d.total > 0 ? Math.round((d.late    / d.total) * colHeightPx) : 0;
              const absentPx  = Math.max(colHeightPx - presentPx - latePx, 0);
              const heightPct = Math.max(Math.round((d.total / maxVal) * 100), 12);
              const presentHeightPct = d.total > 0 ? Math.round((d.present / d.total) * heightPct) : 0;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{d.total}</span>

                  {/* Stacked bar column — absent (red) on bottom, late (yellow) middle, present (green) on top */}
                  <div style={{
                    width: '100%',
                    maxWidth: '36px',
                    height: `${colHeightPx}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    {/* Absent — red, top of stack (since flex is column & bar grows from top) */}
                    {absentPx > 0 && (
                      <div style={{ height: `${absentPx}px`, background: '#ff4d4d', transition: 'height 0.6s ease' }} />
                    )}
                    {/* Late — yellow */}
                    {latePx > 0 && (
                      <div style={{ height: `${latePx}px`, background: '#ffb703', transition: 'height 0.6s ease' }} />
                    )}
                    {/* Present — green, bottom (visually tallest for good days) */}
                    {presentPx > 0 && (
                      <div style={{ height: `${presentPx}px`, background: '#2bd49e', transition: 'height 0.6s ease' }} />
                    )}
                  </div>

                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CHART 3: Class Performance Overview */}
      <div className="glass-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px' }}>
          Class Attendance Rates
        </h3>


        {classPerformance.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No class performance metrics generated yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {classPerformance.map((c, idx) => {
              const badgeColor = c.rate >= 80 ? '#2bd49e' : c.rate >= 65 ? '#ffb703' : '#ff4d4d';
              return (
                <div key={idx} style={{ background: 'var(--subcard-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{c.className}</strong>
                    <span style={{ background: 'var(--badge-bg)', color: badgeColor, border: `1px solid ${badgeColor}40`, padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>
                      {c.rate}% Attendance
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', background: 'var(--progress-track)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${c.rate}%`, height: '100%', background: badgeColor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <span>Present: {c.present}</span>
                    <span>Late: {c.late}</span>
                    <span>Absent: {c.absent}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
