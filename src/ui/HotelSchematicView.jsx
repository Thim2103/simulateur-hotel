import React, { useState, useEffect } from 'react';

/**
 * Composant React pour afficher la structure des étages et des chambres de l'hôtel.
 * @module HotelSchematicView
 */
export default function HotelSchematicView({ 
  hotelData = null, 
  onRoomSelect = () => {}, 
  onFloorSelect = () => {} 
}) {
  const [floors, setFloors] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    if (hotelData && hotelData.floors) {
      setFloors(hotelData.floors);
    } else {
      // Données factices par défaut si aucune donnée n'est fournie
      setFloors([
        {
          id: 'f3',
          level: 3,
          name: '3ème Étage - Suites',
          rooms: [
            { id: 'r301', number: '301', type: 'Suite', status: 'OCCUPIED', guest: 'M. Dupont' },
            { id: 'r302', number: '302', type: 'Suite', status: 'AVAILABLE', guest: null },
            { id: 'r303', number: '303', type: 'Deluxe', status: 'DIRTY', guest: null },
          ]
        },
        {
          id: 'f2',
          level: 2,
          name: '2ème Étage - Standard',
          rooms: [
            { id: 'r201', number: '201', type: 'Standard', status: 'AVAILABLE', guest: null },
            { id: 'r202', number: '202', type: 'Standard', status: 'OCCUPIED', guest: 'Mme. Martin' },
            { id: 'r203', number: '203', type: 'Standard', status: 'MAINTENANCE', guest: null },
            { id: 'r204', number: '204', type: 'Standard', status: 'AVAILABLE', guest: null },
          ]
        },
        {
          id: 'f1',
          level: 1,
          name: '1er Étage - Réception & Chambres',
          rooms: [
            { id: 'r101', number: '101', type: 'Accessible', status: 'AVAILABLE', guest: null },
            { id: 'r102', number: '102', type: 'Standard', status: 'OCCUPIED', guest: 'Dr. House' },
          ]
        }
      ]);
    }
  }, [hotelData]);

  const handleRoomClick = (room, floor) => {
    setSelectedRoom(room);
    setSelectedFloor(floor);
    onRoomSelect(room, floor);
  };

  const handleFloorClick = (floor) => {
    setSelectedFloor(floor);
    onFloorSelect(floor);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE': return '#4ade80'; // Vert
      case 'OCCUPIED': return '#f87171';  // Rouge
      case 'DIRTY': return '#facc15';     // Jaune
      case 'MAINTENANCE': return '#94a3b8'; // Gris
      default: return '#cbd5e1';
    }
  };

  const filteredRooms = (rooms) => {
    if (filterStatus === 'ALL') return rooms;
    return rooms.filter(room => room.status === filterStatus);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Schéma de l'Hôtel</h2>
        <div style={styles.legendContainer}>
          <span style={styles.legendItem}><span style={{...styles.dot, backgroundColor: '#4ade80'}}></span> Disponible</span>
          <span style={styles.legendItem}><span style={{...styles.dot, backgroundColor: '#f87171'}}></span> Occupée</span>
          <span style={styles.legendItem}><span style={{...styles.dot, backgroundColor: '#facc15'}}></span> À nettoyer</span>
          <span style={styles.legendItem}><span style={{...styles.dot, backgroundColor: '#94a3b8'}}></span> Maintenance</span>
        </div>
        <div style={styles.filterContainer}>
          <label htmlFor="status-filter" style={styles.label}>Filtrer : </label>
          <select 
            id="status-filter"
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.select}
          >
            <option value="ALL">Tous les statuts</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="OCCUPIED">Occupée</option>
            <option value="DIRTY">À nettoyer</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      <div style={styles.schematicBody}>
        {floors.length === 0 ? (
          <p style={styles.emptyText}>Aucun étage configuré.</p>
        ) : (
          floors.map((floor) => (
            <div key={floor.id} style={styles.floorRow}>
              <div 
                style={styles.floorHeader} 
                onClick={() => handleFloorClick(floor)}
              >
                <h3 style={styles.floorTitle}>{floor.name}</h3>
                <span style={styles.roomCount}>{floor.rooms.length} chambres</span>
              </div>
              
              <div style={styles.roomsGrid}>
                {filteredRooms(floor.rooms).map((room) => {
                  const isSelected = selectedRoom && selectedRoom.id === room.id;
                  return (
                    <div
                      key={room.id}
                      onClick={() => handleRoomClick(room, floor)}
                      style={{
                        ...styles.roomCard,
                        borderColor: getStatusColor(room.status),
                        backgroundColor: isSelected ? '#e0f2fe' : '#ffffff',
                        boxShadow: isTypeActive(isSelected) ? '0 0 0 2px #0284c7' : 'none'
                      }}
                      title={`Chambre ${room.number} - ${room.type} (${room.status})`}
                    >
                      <div style={styles.roomNumber}>{room.number}</div>
                      <div style={styles.roomType}>{room.type}</div>
                      <div 
                        style={{
                          ...styles.statusIndicator, 
                          backgroundColor: getStatusColor(room.status)
                        }} 
                      />
                    </div>
                  );
                })}
                {filteredRooms(floor.rooms).length === 0 && (
                  <div style={styles.noRoomsFilter}>Aucune chambre pour ce filtre</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedRoom && (
        <div style={styles.detailsPanel}>
          <div style={styles.detailsHeader}>
            <h4>Détails de la chambre {selectedRoom.number}</h4>
            <button onClick={() => setSelectedRoom(null)} style={styles.closeButton}>×</button>
          </div>
          <p><strong>Étage :</strong> {selectedFloor?.name}</p>
          <p><strong>Type :</strong> {selectedRoom.type}</p>
          <p><strong>Statut :</strong> {selectedRoom.status}</p>
          {selectedRoom.guest && <p><strong>Client :</strong> {selectedRoom.guest}</p>}
        </div>
      )}
    </div>
  );
}

function isTypeActive(bool) {
  return bool;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    height: '100%',
    boxSizing: 'border-box',
    color: '#1e293b'
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '15px',
    gap: '10px'
  },
  legendContainer: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    fontSize: '0.85rem'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block'
  },
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  select: {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    fontSize: '0.9rem'
  },
  schematicBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    flex: 1,
    paddingRight: '5px'
  },
  floorRow: {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    padding: '15px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  floorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  floorTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#0f172a'
  },
  roomCount: {
    fontSize: '0.85rem',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '12px'
  },
  roomsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  roomCard: {
    position: 'relative',
    width: '80px',
    height: '70px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none'
  },
  roomNumber: {
    fontWeight: 'bold',
    fontSize: '1rem',
    color: '#0f172a'
  },
  roomType: {
    fontSize: '0.7rem',
    color: '#64748b'
  },
  statusIndicator: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  noRoomsFilter: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontStyle: 'italic',
    padding: '10px'
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: '40px'
  },
  detailsPanel: {
    marginTop: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '15px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: '10px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '8px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: '#64748b'
  }
};