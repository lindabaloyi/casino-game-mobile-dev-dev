import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BuildAdditionOverlay from '../components/overlays/BuildAdditionOverlay';

describe('BuildAdditionOverlay', () => {
  const mockBuildId = 'build123';
  const mockOnAccept = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(
      <BuildAdditionOverlay
        isVisible={true}
        buildId={mockBuildId}
        onAccept={mockOnAccept}
        onCancel={mockOnCancel}
      />
    );
    expect(getByText('ADD-ON')).toBeTruthy();
    expect(getByText('Accept')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <BuildAdditionOverlay
        isVisible={false}
        buildId={mockBuildId}
        onAccept={mockOnAccept}
        onCancel={mockOnCancel}
      />
    );
    expect(queryByText('ADD-ON')).toBeNull();
  });

  it('calls onAccept when the Accept button is pressed', () => {
    const { getByText } = render(
      <BuildAdditionOverlay
        isVisible={true}
        buildId={mockBuildId}
        onAccept={mockOnAccept}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.press(getByText('Accept'));
    expect(mockOnAccept).toHaveBeenCalledTimes(1);
    expect(mockOnAccept).toHaveBeenCalledWith(mockBuildId);
  });

  it('calls onReject when the Cancel button is pressed and onReject is provided', () => {
    const { getByText } = render(
      <BuildAdditionOverlay
        isVisible={true}
        buildId={mockBuildId}
        onAccept={mockOnAccept}
        onCancel={mockOnCancel}
        onReject={mockOnReject}
      />
    );
    fireEvent.press(getByText('Cancel'));
    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(mockOnReject).toHaveBeenCalledWith(mockBuildId);
    expect(mockOnCancel).not.toHaveBeenCalled(); // onCancel should not be called if onReject is present
  });

  it('calls onCancel when the Cancel button is pressed and onReject is NOT provided', () => {
    const { getByText } = render(
      <BuildAdditionOverlay
        isVisible={true}
        buildId={mockBuildId}
        onAccept={mockOnAccept}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.press(getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).toHaveBeenCalledWith(mockBuildId);
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('disables buttons when disabled prop is true', () => {
    const { getByText } = render(
      <BuildAdditionOverlay
        isVisible={true}
        buildId={mockBuildId}
        onAccept={mockOnAccept}
        onCancel={mockOnCancel}
        disabled={true}
      />
    );

    const acceptButton = getByText('Accept');
    const cancelButton = getByText('Cancel');

    fireEvent.press(acceptButton);
    fireEvent.press(cancelButton);

    expect(mockOnAccept).not.toHaveBeenCalled();
    expect(mockOnCancel).not.toHaveBeenCalled();
  });
});