import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);

const STAT_DEFS = [
  { key: 'total', label: 'Total Tickets', sub: 'All tickets', bgColor: '#f39c12', icon: 'bi-tags', status: '' },
  { key: 'new_count', label: 'New', sub: 'Awaiting action', bgColor: '#00a65a', icon: 'bi-people', status: 'New' },
  { key: 'in_progress_count', label: 'In Progress', sub: 'Under investigation', bgColor: '#f39c12', icon: 'bi-hourglass-split', status: 'In Progress' },
  { key: 'resolved_count', label: 'Complete', sub: 'Completed tickets', bgColor: '#6c757d', icon: 'bi-check-circle', status: 'Complete' },
  { key: 'overdue_count', label: 'Overdue', sub: 'Exceeded SLA', bgColor: '#333333', icon: 'bi-exclamation-triangle', status: 'Overdue' }
];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [charts, setCharts] = useState(null);
  const [recent, setRecent] = useState([]);
  const { t } = useLanguage();

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch((err) => { console.error(err); setStats({}); });
    api.get('/dashboard/charts').then((r) => setCharts(r.data)).catch((err) => { console.error(err); setCharts({}); });
    api.get('/tickets', { params: { limit: 6, page: 1 } }).then((r) => setRecent(r.data.data || [])).catch(console.error);
  }, []);

  const totalTickets = stats.total || 1;
  const getPct = (val) => Math.round(((val || 0) / totalTickets) * 100);

  const statusData = [
    { label: `New (${stats.new_count || 0}) ${getPct(stats.new_count)}%`, value: stats.new_count || 0 },
    { label: `In Progress (${stats.in_progress_count || 0}) ${getPct(stats.in_progress_count)}%`, value: stats.in_progress_count || 0 },
    { label: `Complete (${stats.resolved_count || 0}) ${getPct(stats.resolved_count)}%`, value: stats.resolved_count || 0 }
  ];

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1" style={{ color: '#1e293b' }}>Dashboard</h3>
        <div className="text-muted small">Live overview of Help Desk tickets</div>
      </div>

      <div className="row g-3 mb-4">
        {STAT_DEFS.map((s) => (
          <div className="col-12 col-sm-6 col-lg-4" key={s.key}>
            <Link to={s.status ? `/tickets?status=${encodeURIComponent(s.status)}` : "/tickets"} className="text-decoration-none">
              <div 
                className="card border-0 shadow-sm h-100 text-white" 
                style={{ 
                  backgroundColor: s.bgColor, 
                  borderRadius: '10px', 
                  transition: 'transform 0.2s, box-shadow 0.2s' 
                }}
              >
                <div className="card-body p-3 d-flex justify-content-between align-items-center">
                  <div style={{ flex: 1 }}>
                    <div className="fw-bold mb-2 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', opacity: 0.9 }}>
                      {s.label}
                    </div>
                    {s.key === 'resolved_count' ? (
                      <div className="mt-1" style={{ fontSize: '0.85rem' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span style={{ opacity: 0.9 }}>Complete by IT:</span>
                          <span className="fw-bold fs-6">{stats.in_house_count ?? stats.resolved_count ?? 0}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span style={{ opacity: 0.9 }}>Complete by Vendor:</span>
                          <span className="fw-bold fs-6">{stats.vendor_count ?? 0}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="fs-2 fw-bold mb-0" style={{ lineHeight: '1' }}>{stats[s.key] ?? '0'}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px' }}>{s.sub}</div>
                      </>
                    )}
                  </div>
                  <div className="ps-3 text-end" style={{ opacity: 0.4 }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: '3.5rem' }}></i>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {charts ? (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-8">
              <div className="card border-0 shadow h-100" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                    <h6 className="fw-bold mb-0 text-primary text-uppercase" style={{ letterSpacing: '0.5px' }}>{t('monthly_tickets') !== 'monthly_tickets' ? t('monthly_tickets') : 'Monthly Tickets'}</h6>
                    <span className="badge bg-light text-secondary border">{t('last_6_months') !== 'last_6_months' ? t('last_6_months') : 'Last 6 Months'}</span>
                  </div>
                  <div style={{ height: '300px' }}>
                    <Line data={toLineData(charts.monthly)} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow h-100" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                    <h6 className="fw-bold mb-0 text-primary text-uppercase" style={{ letterSpacing: '0.5px' }}>{t('ticket_status') !== 'ticket_status' ? t('ticket_status') : 'Ticket Status'}</h6>
                    <span className="badge bg-light text-secondary border">{stats.total ?? 0} {t('total') !== 'total' ? t('total') : 'Total'}</span>
                  </div>
                  <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
                    <Doughnut data={toDoughnutData(statusData)} options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, padding: 20 } } }, borderWidth: 0 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="card border-0 shadow h-100" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div className="card-body p-4">
                  <div className="mb-4 pb-3 border-bottom">
                    <h6 className="fw-bold mb-0 text-primary text-uppercase" style={{ letterSpacing: '0.5px' }}>{t('by_department') !== 'by_department' ? t('by_department') : 'By Department'}</h6>
                  </div>
                  <div style={{ height: '300px' }}>
                    <Bar data={toDeptBarData(charts.byDepartment, t)} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } } } }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card border-0 shadow h-100" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div className="card-body p-4 d-flex flex-column">
                  <div className="mb-4 pb-3 border-bottom">
                    <h6 className="fw-bold mb-0 text-primary text-uppercase" style={{ letterSpacing: '0.5px' }}>{t('recent_activity') !== 'recent_activity' ? t('recent_activity') : 'Recent Activity'}</h6>
                  </div>
                  <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '300px', paddingRight: '5px' }}>
                    {recent.length > 0 ? recent.map((tItem, i) => (
                      <div key={i} className="d-flex mb-3 align-items-start">
                        <div className="me-3 mt-1">
                          <span className="badge bg-light text-primary border" style={{ padding: '6px 8px' }}>
                            <i className="bi bi-ticket-detailed"></i>
                          </span>
                        </div>
                        <div className="pb-2 border-bottom flex-grow-1">
                          <div className="small fw-bold text-dark mb-1">
                            <Link to={`/tickets/${tItem.id}`} className="text-decoration-none text-dark">
                              [{tItem.ticket_number}] {tItem.subject}
                            </Link>
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {tItem.requester_name} &middot; {new Date(tItem.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-muted small text-center mt-5">{t('no_recent_activity') || 'No recent activity'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      )}
    </div>
  );
}

function toLineData(rows = []) {
  return {
    labels: rows.map((r) => r.label),
    datasets: [{ 
      label: 'Tickets', 
      data: rows.map((r) => r.value), 
      borderColor: '#f39c12', 
      backgroundColor: 'rgba(243, 156, 18, 0.15)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#f39c12'
    }]
  };
}

function toDoughnutData(rows = []) {
  const colors = ['#00a65a', '#f39c12', '#6c757d', '#dd4b39', '#198754'];
  return {
    labels: rows.map((r) => r.label),
    datasets: [{ data: rows.map((r) => r.value), backgroundColor: colors, borderWidth: 0 }]
  };
}

function toCategoryBarData(rows = [], t) {
  return {
    labels: rows.map((r) => r.label || (t ? t('uncategorized') : 'Uncategorized')),
    datasets: [{ label: 'Tickets', data: rows.map((r) => r.value), backgroundColor: '#f39c12', borderRadius: 3, barThickness: 15 }]
  };
}

function toDeptBarData(rows = [], t) {
  return {
    labels: rows.map((r) => r.label || (t ? t('unassigned') : 'Unassigned')),
    datasets: [{ label: 'Tickets', data: rows.map((r) => r.value), backgroundColor: '#e67e22', borderRadius: 3, barThickness: 15 }]
  };
}
