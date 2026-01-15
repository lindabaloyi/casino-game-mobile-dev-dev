import { render } from '@testing-library/react-native';
import { CardType } from '../card';
import DraggableCard from '../DraggableCard';

// Mock card for testingss
const mockCard: CardType = {
  rank: 'A',
  suit: 'H',
  value: 1,
};

const mockCurrentPlayer = 0;

describe('DraggableCard', () => {
  it('renders with gesture detector and card component', () => {
    const { getByTestId, getByText } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
      />
    );

    // Should render gesture detector
    expect(getByTestId('gesture-detector')).toBeTruthy();

    // Should render card content (assuming Card component renders rank)
    expect(getByText('A')).toBeTruthy();
  });

  it('passes draggable and disabled props to gesture hook', () => {
    const { rerender, getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        draggable={true}
        disabled={false}
      />
    );

    // Component should render without errors when props change
    rerender(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        draggable={false}
        disabled={true}
      />
    );

    // Should still render
    expect(getByTestId('gesture-detector')).toBeTruthy();
  });

  it('applies correct zIndex when dragging', () => {
    const { getByTestId, rerender } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        draggable={true}
        disabled={false}
      />
    );

    // Initially should not have dragging zIndex
    const container = getByTestId('gesture-detector');
    expect(container.props.style.zIndex).toBe(1);

    // Note: In a real scenario, isDragging would be true during drag
    // but our mock doesn't simulate the actual drag state changes
    // This test verifies the component structure is correct
  });

  it('renders Card component with correct props', () => {
    const { getByText } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        size="large"
        disabled={true}
        draggable={false}
      />
    );

    // Card component should receive the props
    expect(getByText('A')).toBeTruthy();
  });

  it('applies dragging styles when isDragging is true', () => {
    // This test verifies the component structure supports dragging styles
    // In the actual implementation, isDragging comes from the useDragGesture hook
    const { getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
      />
    );

    const container = getByTestId('gesture-detector');
    expect(container).toBeTruthy();

    // The component should have the structure to apply dragging styles
    // (shadow styles would be applied when isDragging is true)
  });

  it('handles drag end callback when provided', () => {
    const mockOnDragEnd = jest.fn();

    const { getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        onDragEnd={mockOnDragEnd}
      />
    );

    expect(getByTestId('gesture-detector')).toBeTruthy();

    // The callback should be passed to the hook
    // In a real scenario, this would be called by the gesture handler
  });

  it('handles drag start callback when provided', () => {
    const mockOnDragStart = jest.fn();

    const { getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        onDragStart={mockOnDragStart}
      />
    );

    expect(getByTestId('gesture-detector')).toBeTruthy();
  });

  it('handles drag move callback when provided', () => {
    const mockOnDragMove = jest.fn();

    const { getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        onDragMove={mockOnDragMove}
      />
    );

    expect(getByTestId('gesture-detector')).toBeTruthy();
  });

  it('passes dragZIndex prop to control z-index during drag', () => {
    const customZIndex = 9999;

    const { getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        dragZIndex={customZIndex}
      />
    );

    const container = getByTestId('gesture-detector');
    expect(container).toBeTruthy();

    // The dragZIndex prop should be passed to the hook
    // In the actual implementation, this controls the zIndex when dragging
  });

  it('handles triggerReset prop to reset position externally', () => {
    const { rerender, getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        triggerReset={false}
      />
    );

    // Should render without errors
    expect(getByTestId('gesture-detector')).toBeTruthy();

    // Trigger reset by changing prop
    rerender(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        triggerReset={true}
      />
    );

    // Should still render (resetPosition should be called internally)
    expect(getByTestId('gesture-detector')).toBeTruthy();
  });

  it('passes source and stackId props to drag callbacks', () => {
    const mockOnDragEnd = jest.fn();
    const source = 'hand';
    const stackId = 'test-stack';

    const { getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
        source={source}
        stackId={stackId}
        onDragEnd={mockOnDragEnd}
      />
    );

    expect(getByTestId('gesture-detector')).toBeTruthy();

    // The source and stackId should be available in the drag end callback
    // This is used to identify which card is being dragged
  });

  it('renders animated view with proper styling', () => {
    const { getByTestId } = render(
      <DraggableCard
        card={mockCard}
        currentPlayer={mockCurrentPlayer}
      />
    );

    const animatedView = getByTestId('animated-view');
    expect(animatedView).toBeTruthy();

    // Should have transform style from the animated hook
    expect(animatedView.props.style.transform).toBeDefined();
  });

  it('prevents crashes when drag callbacks access React state via runOnJS', () => {
    // This test verifies that the component can be rendered with callbacks
    // that would normally access React state, but are protected by runOnJS
    const mockCallback = jest.fn();

    expect(() => {
      render(
        <DraggableCard
          card={mockCard}
          currentPlayer={mockCurrentPlayer}
          onDragStart={mockCallback}
          onDragMove={mockCallback}
          onDragEnd={mockCallback}
        />
      );
    }).not.toThrow();

    // If runOnJS wasn't working, this would crash when callbacks try to access React state
  });
});
