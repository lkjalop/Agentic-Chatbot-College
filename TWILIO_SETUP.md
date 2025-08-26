# 📞 Twilio Voice Integration Setup

## **Overview**

The Digital Career Coach now includes intelligent voice calling capabilities with an AI-powered Student Admin Agent that can:

- Answer basic inquiries about courses, pricing, and schedules
- Intelligently route calls to appropriate human teams
- Handle crisis situations and escalations
- Provide natural voice responses
- Maintain conversation context

## **Architecture**

```
Incoming Call → Twilio Webhook → Student Admin Agent → Decision Engine
                                      ↓
                   AI Response ← TwiML Generator ← Route Decision
                                      ↓
                Human Transfer ← Team Routing ← Transfer Decision
```

## **1. Twilio Account Setup**

### **Step 1: Create Twilio Account**
1. Go to [twilio.com](https://twilio.com) and create account
2. Get your Account SID and Auth Token from Console
3. Purchase a phone number for your region

### **Step 2: Configure Webhooks**
Set these webhook URLs in your Twilio Phone Number configuration:

**Incoming Calls:**
```
https://your-domain.com/api/voice/incoming
```

**Transcription Callback:**
```  
https://your-domain.com/api/voice/transcribe
```

## **2. Environment Variables**

Add these to your production environment:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Team Phone Numbers (for transfers)
HUMAN_ADVISOR_NUMBER=+61234567890
ENROLLMENT_TEAM_NUMBER=+61234567891  
TECHNICAL_TEAM_NUMBER=+61234567892
FINANCIAL_TEAM_NUMBER=+61234567893
```

## **3. Student Admin Agent Decision Flow**

### **AI Handles These Queries:**
✅ **Basic Course Information** (Confidence: 90%)
- "What courses do you offer?"
- "Tell me about the data science program"

✅ **Pricing Questions** (Confidence: 95%)
- "How much does it cost?"
- "What are the payment options?"

✅ **Schedule Inquiries** (Confidence: 85%)
- "When do classes start?"
- "How long is the program?"

### **Routes to Humans:**
🔄 **Enrollment Team** - Applications, start dates, requirements
🔄 **Technical Team** - Curriculum details, prerequisites, technical questions  
🔄 **Financial Team** - Payment plans, scholarships, refunds
🔄 **General Team** - Complex queries, complaints, general support

### **Immediate Escalations:**
🚨 **Crisis Keywords** → Urgent human transfer
🚨 **Complaint Language** → Supervisor transfer
🚨 **Legal/Refund Requests** → Financial team transfer

## **4. Voice Response System**

### **Response Optimization:**
- **Length**: Max 30 seconds (60-80 words)
- **Natural Speech**: Includes pauses and conversational flow
- **Clarity**: Spells out abbreviations (A.I., I.T.)
- **Engagement**: Always offers next steps

### **Example Interactions:**

**Caller:** "What programs do you offer?"

**AI Response:** "We offer four career tracks... Data & A.I. at $740, Cybersecurity, Business Analysis, and Full Stack Development. Programs are 4 weeks or 10 weeks with real industry projects. Which track interests you most?"

**Caller:** "I want to apply"  

**AI Decision:** Transfer to Enrollment Team

**AI Response:** "Excellent! Let me connect you directly with our enrollment advisor who can start your application process right away."

## **5. Call Analytics & Monitoring**

### **Tracked Metrics:**
- Call volume and duration
- AI vs Human handling rates
- Successful call resolutions  
- Transfer reasons and patterns
- Caller satisfaction (future)

### **Logging:**
```typescript
// Each call logs:
{
  callSid: "CA1234567890",
  from: "+61234567890", 
  duration: 120,
  intent: "course-inquiry",
  routedTo: "ai" | "enrollment" | "technical",
  transcription: "What courses do you offer?",
  confidence: 0.92
}
```

## **6. Testing & Development**

### **Local Testing with ngrok:**
1. Install ngrok: `npm install -g ngrok`
2. Start your app: `npm run dev`
3. Expose webhook: `ngrok http 3000`
4. Update Twilio webhook to ngrok URL

### **Test Call Scenarios:**
```bash
# Basic inquiry (should be handled by AI)
"Tell me about your data science course"

# Complex application (should transfer to enrollment)  
"I want to apply but have questions about my background"

# Complaint (should escalate to supervisor)
"I'm very disappointed with your service"

# Crisis (should immediate escalate)
"I'm having a really hard time and considering giving up"
```

## **7. Production Deployment**

### **Webhook Security:**
- Twilio validates webhooks with signatures
- All requests are authenticated
- Rate limiting protects against abuse

### **Failsafe Mechanisms:**
- AI errors → Automatic human transfer
- Missing environment variables → Human transfer
- Call duration limits → Automatic handoff
- Crisis detection → Immediate escalation

### **Scaling Considerations:**
- Current capacity: 50 concurrent calls
- Memory-efficient session management
- Call history cleanup (10 messages max)
- Automatic session cleanup after 1 hour

## **8. Cost Management**

### **Twilio Costs (Approximate):**
- **Phone Number**: $1/month
- **Incoming Calls**: $0.0075/minute
- **Transcription**: $0.02/minute
- **Outbound Calls**: $0.01/minute

### **Expected Monthly Cost:**
- 500 calls/month × 3 min avg = $35/month
- Very cost-effective compared to human staffing

## **9. Future Enhancements**

### **Roadmap:**
- [ ] SMS integration for follow-ups
- [ ] Voicemail transcription and routing
- [ ] Callback scheduling automation
- [ ] Multi-language support
- [ ] Call sentiment analysis
- [ ] Integration with CRM systems

## **10. Troubleshooting**

### **Common Issues:**

**Calls not connecting:**
- Check Twilio webhook URLs
- Verify environment variables
- Check server accessibility

**AI not responding:**
- Check GROQ_API_KEY configuration
- Review transcription quality
- Monitor API rate limits

**Transfers failing:**
- Verify team phone numbers
- Check Twilio account balance
- Review call logs

### **Debug Commands:**
```bash
# Test Twilio integration
curl -X POST https://your-domain.com/api/voice/incoming \
  -d "CallSid=test" -d "From=+1234567890" -d "To=+1234567891"

# Check environment  
npm run db:validate

# Monitor logs
tail -f logs/voice-calls.log
```

---

## **🚀 Quick Start**

1. **Set up Twilio account** and get credentials
2. **Add environment variables** to your deployment
3. **Configure webhooks** in Twilio Console  
4. **Test with a call** to your Twilio number
5. **Monitor call logs** and adjust routing as needed

The system is designed to be production-ready with intelligent routing, proper error handling, and cost-effective scaling.

**Status: ✅ Ready for Production**