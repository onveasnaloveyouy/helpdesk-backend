import { useState, useEffect } from 'react';
import ManageDepartments from './ManageDepartments';

export default function ManageLocations() {
  const [activeTab, setActiveTab] = useState('locations');
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [newLoc, setNewLoc] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editName, setEditName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_locations');
    if (saved) {
      setLocations(JSON.parse(saved));
    } else {
      const defaults = ['Administration Office', 'Warehouse Office', 'Finance Office', 'Marketing Office', 'Accounting Office', 'IT Office', 'Engineering Office', 'HR Office', 'Sales Office', 'Procurement Office', 'NBC Office'];
      setLocations(defaults);
      localStorage.setItem('app_locations', JSON.stringify(defaults));
    }
    const savedUsers = JSON.parse(localStorage.getItem('app_users') || '[]');
    setUsers(savedUsers);
  }, []);

  function handleAdd(e) {
    e.preventDefault();
    if (!newLoc.trim()) return;
    if (locations.includes(newLoc.trim())) {
      alert("Location already exists!");
      return;
    }
    const updated = [...locations, newLoc.trim()];
    setLocations(updated);
    localStorage.setItem('app_locations', JSON.stringify(updated));
    setNewLoc('');
    setShowAddForm(false);
  }

  function handleCancel() {
    setNewLoc('');
    setShowAddForm(false);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    const updated = locations.map((loc, idx) => idx === editingIdx ? editName.trim() : loc);
    setLocations(updated);
    localStorage.setItem('app_locations', JSON.stringify(updated));
    setEditingIdx(null);
  }

  function handleDelete(locToDelete) {
    const updated = locations.filter(loc => loc !== locToDelete);
    setLocations(updated);
    localStorage.setItem('app_locations', JSON.stringify(updated));
  }



  return (
    <div className="container-fluid py-4">
      
      {/* Locations Section */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0 text-secondary fw-normal">Manage Locations</h4>
          <button className="btn btn-warning text-white btn-sm px-3 rounded-pill" onClick={() => {
            setNewLoc('');
            setShowAddForm(true);
          }}>
            <i className="bi bi-plus-circle me-1"></i>New Location
          </button>
        </div>

        {/* Add Modal */}
        {showAddForm && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={handleAdd}>
                  <div className="modal-header">
                    <h5 className="modal-title fs-5"><i className="bi bi-plus-circle me-2"></i>Create New Location</h5>
                    <button type="button" className="btn-close" onClick={handleCancel}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Location Name <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Administration Office" 
                        value={newLoc}
                        onChange={(e) => setNewLoc(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer border-0 pt-0">
                    <button type="button" className="btn btn-light" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="btn btn-warning text-white fw-semibold px-4"><i className="bi bi-check2 me-1"></i>Create</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Locations Table */}
        <div className="bg-white rounded shadow-sm border overflow-hidden">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '50px' }}>No.</th>
                <th>Location Name</th>
                <th>Users Count</th>
                <th style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-4">No locations added.</td>
                </tr>
              ) : (
                locations.map((loc, idx) => {
                  const count = users.filter(u => u.location === loc).length;
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td 
                        className="fw-semibold" 
                        onClick={() => { setEditingIdx(idx); setEditName(loc); }}
                        style={{ cursor: 'pointer' }}
                        title="Click to edit location"
                      >
                        {loc}
                      </td>
                      <td><span className="badge bg-secondary">{count}</span></td>
                      <td>
                        <div className="btn-group btn-group-sm shadow-sm">
                          <button className="btn btn-outline-warning" onClick={() => { setEditingIdx(idx); setEditName(loc); }} title="Edit">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-outline-danger" onClick={() => handleDelete(loc)} title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Departments Section */}
      <div>
        <ManageDepartments />
      </div>

      {/* Edit Modal */}
      {editingIdx !== null && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={saveEdit}>
                <div className="modal-header">
                  <h5 className="modal-title fs-5">
                    <i className="bi bi-pencil-square me-2"></i>Edit Location
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setEditingIdx(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Location Name <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setEditingIdx(null)}>Cancel</button>
                  <button type="submit" className="btn btn-warning text-white fw-semibold px-4"><i className="bi bi-check2 me-1"></i>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
