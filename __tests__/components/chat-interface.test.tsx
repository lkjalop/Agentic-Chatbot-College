import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from '@/app/components/chat-interface';
import { useSession } from 'next-auth/react';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock the voice hook
jest.mock('@/lib/hooks/use-voice', () => ({
  useVoiceRecognition: () => ({
    isSupported: true,
    isListening: false,
    transcript: '',
    startListening: jest.fn(),
    stopListening: jest.fn(),
    resetTranscript: jest.fn()
  })
}));

// Mock VoiceCallWidget
jest.mock('@/app/components/voice-call-widget', () => {
  return function MockVoiceCallWidget() {
    return <div data-testid="voice-call-widget">Voice Widget</div>;
  };
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('ChatInterface', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
      },
      status: 'authenticated'
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        response: 'Test response from API',
        diagnostics: {
          agent: 'knowledge',
          confidence: 80,
          sources: ['Test Source']
        }
      })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat interface correctly', () => {
    render(<ChatInterface onClose={jest.fn()} />);
    
    expect(screen.getByText('AI Career Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByText('New chat')).toBeInTheDocument();
  });

  it('displays initial welcome messages', () => {
    render(<ChatInterface onClose={jest.fn()} />);
    
    expect(screen.getByText(/Welcome! I'm your AI career assistant/)).toBeInTheDocument();
    expect(screen.getByText(/How can I help you today/)).toBeInTheDocument();
  });

  it('handles message input and sending', async () => {
    render(<ChatInterface onClose={jest.fn()} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Initially send button should be disabled
    expect(sendButton).toBeDisabled();

    // Type a message
    fireEvent.change(input, { target: { value: 'What bootcamps do you offer?' } });
    
    // Send button should now be enabled
    expect(sendButton).not.toBeDisabled();

    // Send the message
    fireEvent.click(sendButton);

    // Check if user message appears
    expect(screen.getByText('What bootcamps do you offer?')).toBeInTheDocument();

    // Wait for API response
    await waitFor(() => {
      expect(screen.getByText('Test response from API')).toBeInTheDocument();
    });
  });

  it('handles Enter key to send message', async () => {
    render(<ChatInterface onClose={jest.fn()} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('toggles sidebar when menu button is clicked', () => {
    render(<ChatInterface onClose={jest.fn()} />);
    
    const sidebar = screen.getByText('New chat').closest('.sidebar');
    expect(sidebar).not.toHaveClass('collapsed');

    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    expect(sidebar).toHaveClass('collapsed');
  });

  it('shows Under the Hood panel when settings clicked', () => {
    render(<ChatInterface onClose={jest.fn()} />);
    
    // Initially panel should be hidden
    const panel = document.querySelector('.agent-panel');
    expect(panel).not.toHaveClass('visible');

    // Click settings to show panel
    const settingsButton = screen.getAllByRole('button')[1]; // Second button is settings
    fireEvent.click(settingsButton);

    expect(panel).toHaveClass('visible');
    expect(screen.getByText('Under the Hood')).toBeInTheDocument();
  });

  it('displays loading state while waiting for response', async () => {
    // Make fetch delay to test loading state
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ response: 'Delayed response' })
      }), 100))
    );

    render(<ChatInterface onClose={jest.fn()} />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Should show thinking indicator
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
    
    // Input should be disabled during loading
    expect(input).toBeDisabled();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<ChatInterface onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});