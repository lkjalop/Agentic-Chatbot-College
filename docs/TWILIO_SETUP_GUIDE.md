# Twilio Voice Integration Setup Guide

## ✅ Integration Complete!

Your application now has full Twilio voice calling functionality integrated with your existing AI system.

## 🎯 What's New

### 1. **Orange Phone Button** 
- **Location**: Bottom-right corner of homepage
- **Functionality**: Click to open call dialog, enter phone number, get AI voice calls
- **Design**: Gradient orange-to-red with pulse animation

### 2. **Voice API Endpoints**
- `/api/voice/call` - Initiates outbound calls
- `/api/voice/incoming` - Handles incoming call webhooks  
- `/api/voice/process-speech` - Processes speech and generates AI responses

### 3. **AI Voice Assistant**
- Uses your existing search system and knowledge base
- Provides contextual responses about courses, careers, visa info
- Maintains conversation context during calls

## 🔧 Setup Required

### Step 1: Get Twilio Credentials
1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up/login to your account
3. Get your credentials:
   - **Account SID**: Found on dashboard
   - **Auth Token**: Found on dashboard  
   - **Phone Number**: Buy a phone number from Twilio

### Step 2: Add Environment Variables
Add these to your Vercel environment variables:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Configure Twilio Webhook
1. In Twilio Console, go to Phone Numbers > Manage > Active numbers
2. Click on your phone number
3. Set webhook URL to: `https://your-app.vercel.app/api/voice/incoming`
4. Set HTTP method to: **POST**

### Step 4: Deploy to Vercel
The integration is ready! Deploy to Vercel and the voice calling will work.

## 🚀 How It Works

### For Users:
1. **Click orange phone button** on homepage
2. **Enter phone number** in dialog
3. **Click "Call Now"** - they'll receive a call within 30 seconds
4. **Talk to AI assistant** - ask about courses, careers, visa info
5. **Natural conversation** - AI maintains context throughout call

### Behind the Scenes:
1. User clicks → calls `/api/voice/call` → Twilio initiates call
2. Call connects → Twilio hits `/api/voice/incoming` webhook
3. AI welcomes user and prompts for question
4. User speaks → Twilio converts to text → `/api/voice/process-speech`
5. AI searches your knowledge base → generates response → speaks back
6. Conversation continues until user hangs up

## 📱 Features

### Voice Call Widget Features:
- **Phone number validation** with auto-formatting
- **Real-time call status** (calling, connected, failed)
- **Error handling** with user-friendly messages
- **Responsive design** works on mobile and desktop
- **Call history** (can be extended)

### AI Voice Features:
- **Context awareness** - remembers conversation
- **Domain expertise** - focuses on education/career topics
- **Fallback handling** - graceful error recovery
- **Speech optimization** - removes markdown, limits length
- **Multi-turn conversations** - asks follow-up questions

## 🧪 Testing

### Local Testing (Development):
1. **Install ngrok**: `npm install -g ngrok`
2. **Run locally**: `npm run dev`
3. **Expose webhook**: `ngrok http 3000`
4. **Update Twilio webhook** to ngrok URL: `https://abc123.ngrok.io/api/voice/incoming`
5. **Test calling** your Twilio number directly

### Production Testing:
1. **Deploy to Vercel** with Twilio environment variables
2. **Update webhook URL** to production URL
3. **Test the orange button** on your live site
4. **Monitor logs** in Vercel dashboard

## 🔧 Troubleshooting

### Common Issues:

**1. "Twilio not configured" Error**
- Check environment variables are set in Vercel
- Verify Account SID, Auth Token, and Phone Number are correct

**2. Calls Not Coming Through**
- Check webhook URL is correct in Twilio console
- Verify webhook URL is accessible (try visiting it in browser)
- Check phone number format includes country code (+1)

**3. AI Not Responding**
- Check vector database is populated with data
- Verify UPSTASH credentials are working
- Monitor API logs for search errors

**4. Speech Recognition Issues**
- Speak clearly and avoid background noise
- Check Twilio speech settings in webhook responses
- Test with simple questions first

### Debug Endpoints:
- `GET /api/voice/call` - Check Twilio configuration status
- Check Vercel function logs for detailed error messages

## 💰 Twilio Costs

**Typical Usage Costs:**
- **Phone number**: ~$1/month
- **Voice calls**: ~$0.013/minute (US)
- **Speech-to-text**: ~$0.02/minute
- **Text-to-speech**: ~$0.016/minute

**Example**: 100 minutes of conversation per month ≈ $6-8 total

## 🔒 Security Notes

- **Rate limiting**: Consider adding rate limits to prevent abuse
- **Phone validation**: Numbers are formatted but not verified
- **Conversation logging**: Currently in memory (consider database storage)
- **Access control**: No authentication required for calling (by design)

## 📈 Analytics & Monitoring

### Available Data:
- Call duration and status via Twilio dashboard
- User questions and AI responses in application logs
- Conversation context stored temporarily

### Recommended Monitoring:
- Set up Vercel monitoring for API endpoints
- Monitor Twilio usage and costs
- Track successful vs failed calls
- Monitor AI response quality

## 🔄 Next Steps (Optional Enhancements)

### Short Term:
1. **Add call recording** (set `record: true` in call creation)
2. **Implement conversation persistence** (save to database)
3. **Add rate limiting** for call endpoint
4. **Phone number verification** (Twilio Verify API)

### Medium Term:
1. **Multi-language support** (change voice/language based on user)
2. **Advanced speech settings** (adjust timeout, recognition settings)
3. **Integration with CRM** (log calls to student records)
4. **Callback scheduling** (allow users to schedule calls)

### Long Term:
1. **Voice biometric authentication**
2. **Integration with calendar systems**
3. **Advanced conversation analytics**
4. **AI personality customization**

## ✅ Deployment Checklist

- [ ] Twilio account created and phone number purchased
- [ ] Environment variables added to Vercel
- [ ] Webhook URL configured in Twilio console  
- [ ] Application deployed to Vercel
- [ ] Orange phone button visible on homepage
- [ ] Test call completed successfully
- [ ] AI responses working correctly
- [ ] Error handling tested
- [ ] Costs and usage monitoring set up

## 🎉 You're Ready!

Your AI-powered voice assistant is now live! Users can click the orange phone button and have natural conversations with your AI about education and career topics.

The system intelligently routes conversations, maintains context, and provides helpful responses using your existing knowledge base.

**Test it out**: Click the orange phone button on your live site and have a conversation with your AI assistant!