# Multi-Agent AI Coaching App Design Guidelines

## Design Approach
**System-Based Approach**: Using Material Design principles for this utility-focused productivity application, emphasizing clarity, accessibility, and efficient information processing.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary** (recommended default):
- Background: 12 8% 8% (deep charcoal)
- Surface: 12 6% 12% (elevated panels)
- Primary: 210 100% 60% (modern blue)
- Text Primary: 0 0% 95% (near white)
- Text Secondary: 0 0% 70% (muted)

**Light Mode**:
- Background: 0 0% 98% (clean white)
- Surface: 0 0% 100% (pure white cards)
- Primary: 210 100% 50% (vibrant blue)
- Text Primary: 0 0% 10% (dark gray)

### B. Typography
- **Primary Font**: Inter (Google Fonts)
- **Sizes**: text-sm (chat), text-base (UI), text-lg (headers)
- **Weights**: font-normal (body), font-medium (labels), font-semibold (headers)

### C. Layout System
**Tailwind Spacing Units**: 2, 4, 6, 8, 12, 16
- Consistent p-4, m-6, gap-4 throughout interface
- Chat messages: p-6 spacing
- Buttons: px-6 py-3 for comfortable touch targets

### D. Component Library

**Chat Interface**:
- Split layout: voice input on left, 5-message display on right
- Message cards with rounded-xl corners and subtle shadows
- User message: distinct visual treatment (slightly different background)
- Agent messages: grouped visually but clearly separated
- Play buttons: circular, consistent sizing (w-8 h-8)

**Voice Input Section**:
- Large, prominent microphone button (w-16 h-16)
- Recording indicator with subtle pulsing animation
- Audio waveform visualization during recording
- Clear visual feedback for recording states

**Message Display**:
- Card-based layout for each of the 5 messages
- Consistent header showing agent type/role
- Text content in readable typography
- Play button positioned consistently (top-right of each card)
- Audio loading states and playback indicators

**Navigation & Controls**:
- Minimal top navigation bar
- Settings icon for future agent customization
- Clear visual hierarchy with proper contrast ratios

### E. Interaction Patterns
- **Voice Recording**: Single tap to start, tap again to stop
- **Playback**: Individual play/pause states for each message
- **Visual Feedback**: Loading states for STT and AI processing
- **Error Handling**: Clear messaging for microphone permissions, API failures

### F. Accessibility
- High contrast ratios (4.5:1 minimum)
- Screen reader support for all voice messages
- Keyboard navigation support
- Focus indicators on interactive elements
- Consistent dark mode implementation across all inputs and text fields

### G. Performance Considerations
- Lazy loading for older chat history
- Efficient audio storage and retrieval
- Progressive enhancement for voice features
- Responsive design for mobile and desktop use

## Key Design Principles
1. **Clarity First**: Prioritize readability and clear information hierarchy
2. **Consistent Spacing**: Maintain rhythm with established spacing units
3. **Voice-Centric**: Design emphasizes audio interactions over visual complexity
4. **Multi-Message Flow**: Clear visual separation between the 5 simultaneous messages
5. **Professional Aesthetic**: Clean, modern interface suitable for productivity use