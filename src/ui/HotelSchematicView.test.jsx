import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import HotelSchematicView from './HotelSchematicView';

describe('HotelSchematicView Component', () => {
  const customHotelData = {
    floors: [
      {
        id: 'f1',
        level: 1,
        name: 'Étage Test',
        rooms: [
          { id: 'r1', number: '101', type: 'Standard', status: 'AVAILABLE', guest: null },
          { id: 'r2', number: '102', type: 'Suite', status: 'OCCUPIED', guest: 'John Doe' }
        ]
      }
    ]
  };

  it('renders default data when no hotelData is provided', () => {
    render(<HotelSchematicView />);
    
    expect(screen.getByText("Schéma de l'Hôtel")).toBeInTheDocument();
    expect(screen.getByText('3ème Étage - Suites')).toBeInTheDocument();
    expect(screen.getByText('2ème Étage - Standard')).toBeInTheDocument();
    expect(screen.getByText('1er Étage - Réception & Chambres')).toBeInTheDocument();
    expect(screen.getByText('301')).toBeInTheDocument();
  });

  it('renders custom hotelData when provided', () => {
    render(<HotelSchematicView hotelData={customHotelData} />);
    
    expect(screen.getByText('Étage Test')).toBeInTheDocument();
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('102')).toBeInTheDocument();
    expect(screen.queryByText('3ème Étage - Suites')).not.toBeInTheDocument();
  });

  it('handles empty floors gracefully', () => {
    render(<HotelSchematicView hotelData={{ floors: [] }} />);
    
    expect(screen.getByText('Aucun étage configuré.')).toBeInTheDocument();
  });

  it('filters rooms based on selected status', () => {
    render(<HotelSchematicView hotelData={customHotelData} />);
    
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('102')).toBeInTheDocument();

    const select = screen.getByLabelText('Filtrer :');
    fireEvent.change(select, { target: { value: 'AVAILABLE' } });

    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.queryByText('102')).not.toBeInTheDocument();
  });

  it('displays message when filter returns no rooms', () => {
    render(<HotelSchematicView hotelData={customHotelData} />);

    const select = screen.getByLabelText('Filtrer :');
    fireEvent.change(select, { target: { value: 'MAINTENANCE' } });

    expect(screen.getByText('Aucune chambre pour ce filtre')).toBeInTheDocument();
  });

  it('triggers onRoomSelect and displays details panel when a room is clicked', () => {
    const handleRoomSelect = vi.fn();
    render(<HotelSchematicView hotelData={customHotelData} onRoomSelect={handleRoomSelect} />);

    const roomCard = screen.getByText('102').closest('div');
    fireEvent.click(roomCard);

    expect(handleRoomSelect).toHaveBeenCalledTimes(1);
    expect(handleRoomSelect).toHaveBeenCalledWith(
      customHotelData.floors[0].rooms[1],
      customHotelData.floors[0]
    );

    expect(screen.getByText('Détails de la chambre 102')).toBeInTheDocument();
    expect(screen.getByText('Étage :')).toBeInTheDocument();
    // Floor name and room type appear both in the grid and in the details panel.
    expect(screen.getAllByText('Étage Test')).toHaveLength(2);
    expect(screen.getAllByText('Suite')).toHaveLength(2);
    expect(screen.getByText('OCCUPIED')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('closes details panel when close button is clicked', () => {
    render(<HotelSchematicView hotelData={customHotelData} />);

    const roomCard = screen.getByText('101').closest('div');
    fireEvent.click(roomCard);

    expect(screen.getByText('Détails de la chambre 101')).toBeInTheDocument();

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Détails de la chambre 101')).not.toBeInTheDocument();
  });

  it('triggers onFloorSelect when floor header is clicked', () => {
    const handleFloorSelect = vi.fn();
    render(<HotelSchematicView hotelData={customHotelData} onFloorSelect={handleFloorSelect} />);

    const floorHeader = screen.getByText('Étage Test');
    fireEvent.click(floorHeader);

    expect(handleFloorSelect).toHaveBeenCalledTimes(1);
    expect(handleFloorSelect).toHaveBeenCalledWith(customHotelData.floors[0]);
  });
});