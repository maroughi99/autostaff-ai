import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private anthropic: Anthropic;
  private preferredProvider: 'claude' | 'openai' = 'claude';
  private calendarService: any; // Will be injected

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  setCalendarService(calendarService: any) {
    this.calendarService = calendarService;
  }

  private async callAI(params: {
    systemPrompt?: string;
    userPrompt: string;
    jsonMode?: boolean;
    temperature?: number;
  }): Promise<string> {
    const { systemPrompt, userPrompt, jsonMode = false, temperature = 0.7 } = params;

    try {
      // Try Claude first (cheaper, better)
      if (this.preferredProvider === 'claude' && process.env.ANTHROPIC_API_KEY) {
        this.logger.debug('Using Claude AI');
        
        // Try models in order of preference - Haiku first for cost savings
        const models = [
          'claude-haiku-3-20250219',   // Fastest/cheapest - now primary
          'claude-sonnet-4-20250514',  // Fallback if Haiku fails
          'claude-opus-4-20250514',    // Last resort
        ];
        
        for (const model of models) {
          try {
            const response = await this.anthropic.messages.create({
              model,
              max_tokens: 2048,
              temperature,
              system: systemPrompt || 'You are a helpful AI assistant.',
              messages: [
                {
                  role: 'user',
                  content: userPrompt,
                },
              ],
            });

            this.logger.debug(`Successfully used Claude model: ${model}`);
            return response.content[0].type === 'text' ? response.content[0].text : '';
          } catch (modelError) {
            this.logger.debug(`Model ${model} failed: ${modelError.message}`);
            continue;
          }
        }
        
        throw new Error('All Claude models failed');
      }
    } catch (error) {
      this.logger.warn(`Claude AI failed, falling back to OpenAI: ${error.message}`);
    }

    // Fallback to OpenAI
    try {
      this.logger.debug('Using OpenAI');
      
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: userPrompt });

      const config: any = {
        model: 'gpt-4-turbo-preview',
        messages,
        temperature,
      };

      if (jsonMode) {
        config.response_format = { type: 'json_object' };
      }

      const response = await this.openai.chat.completions.create(config);
      return response.choices[0].message.content;
    } catch (error) {
      this.logger.error(`Both AI providers failed: ${error.message}`);
      throw new Error(`AI service unavailable: ${error.message}`);
    }
  }

  async classifyMessage(content: string): Promise<{
    category: 'lead' | 'question' | 'spam' | 'customer' | 'problem';
    confidence: number;
    intent: string;
  }> {
    const prompt = `Classify this customer message into one of these categories:
- lead: New potential customer inquiry
- question: General question about services
- spam: Spam or irrelevant message
- customer: Existing customer message
- problem: Customer reporting an issue

Message: "${content}"

Respond with ONLY valid JSON: {"category": "...", "confidence": 0.0-1.0, "intent": "brief description"}`;

    const response = await this.callAI({
      userPrompt: prompt,
      jsonMode: true,
      temperature: 0.3,
    });

    return JSON.parse(response);
  }

  async generateResponse(
    message: string,
    context?: any,
  ): Promise<{ response: string; shouldSendAutomatically: boolean }> {
    const systemPrompt = `You are a helpful AI assistant for a service business. 
Your job is to respond to customer inquiries professionally, gather necessary information, 
and guide them toward booking a service.

Business context: ${JSON.stringify(context || {})}

Generate a professional, friendly response that:
1. Answers their question
2. Asks for missing information (name, address, phone, service details)
3. Offers to schedule a consultation or quote
4. Sounds natural and conversational

Keep responses concise (2-3 sentences max).`;

    const generatedResponse = await this.callAI({
      systemPrompt,
      userPrompt: message,
      temperature: 0.7,
    });
    
    // Simple logic to determine if response should be sent automatically
    const shouldSendAutomatically = !message.toLowerCase().includes('urgent') &&
      !message.toLowerCase().includes('complaint');

    return {
      response: generatedResponse,
      shouldSendAutomatically,
    };
  }

  async extractLeadInfo(message: string): Promise<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    serviceType?: string;
    details?: string;
  }> {
    const prompt = `Extract lead information from this message. Return ONLY valid JSON with available fields:
- name
- email
- phone
- address
- serviceType
- details

Message: "${message}"

Only include fields that are clearly present in the message. Return empty object {} if nothing found.`;

    const response = await this.callAI({
      userPrompt: prompt,
      jsonMode: true,
      temperature: 0.3,
    });

    // Strip markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error('Failed to parse lead info JSON:', cleaned);
      return {};
    }
  }

  async generateEmailReply(params: {
    inboundMessage: string;
    subject: string;
    leadInfo: any;
    businessContext?: any;
    conversationHistory?: Array<{ role: string; content: string }>;
    userId?: string;
    availableSlots?: any[];
  }): Promise<{
    subject: string;
    body: string;
    needsApproval: boolean;
    confidence: number;
    bookingRequested?: boolean;
    confirmedSlot?: { start: string; end: string; formatted: string };
    quoteRequested?: boolean;
  }> {
    const { inboundMessage, subject, leadInfo, businessContext, conversationHistory = [], userId, availableSlots } = params;

    const systemPrompt = `You are an AI assistant for a service business that helps respond to customer emails professionally.

Business Context:
${JSON.stringify(businessContext || { name: 'AutoStaff AI', type: 'Service Business' }, null, 2)}

Your responsibilities:
1. Respond professionally and warmly
2. Answer questions clearly
3. REMEMBER and reference information the customer provides (address, phone, specific details)
4. Ask for missing information only if not already provided in conversation
5. Guide toward booking a site visit, consultation, or getting a quote
6. Keep responses conversational and natural (2-4 sentences)
7. ALWAYS end with a professional signature:
   
   Best regards,
   ${businessContext?.name || 'AutoStaff AI'} Team

${availableSlots && availableSlots.length > 0 ? `
AVAILABLE TIME SLOTS for site visits/consultations:
${availableSlots.map((slot, i) => `${i + 1}. ${slot.formatted}`).join('\n')}

When the customer asks to schedule or wants to book a site visit:
- FIRST check if you have their address in the Lead Information below
- If NO address is provided: Ask for their address before offering times (e.g., "I'd be happy to schedule a visit! What's your address?")
- If address IS provided: Provide 3-5 of these available times and ask them to choose
- Make it conversational and friendly
- If they confirm a specific time (e.g., "Monday at 10 AM works"), acknowledge it warmly and confirm the booking
- Say something like "Perfect! I've scheduled your site visit for [TIME] at [ADDRESS]. You'll receive a calendar invitation shortly. We'll see you then!"
` : ''}

Lead Information (ALWAYS reference this info - don't ask for it again):
- Name: ${leadInfo.name || 'Unknown'}
- Email: ${leadInfo.email}
- Phone: ${leadInfo.phone || 'Not provided'}
- Address: ${leadInfo.address || 'Not provided'}
- Service Type: ${leadInfo.serviceType || 'Not specified'}
- Stage: ${leadInfo.stage}
- Priority: ${leadInfo.priority}

IMPORTANT: Read the entire conversation history carefully. If the customer has already provided information (like their address), acknowledge it and use it. Don't ask for it again.

Generate a response that addresses their inquiry and moves them forward in the sales process.`;

    // Build conversation context for Claude
    let conversationContext = '';
    const userPrompt = `Generate an email response to the following message.

Inbound Message:
${inboundMessage}

Lead Information:
${JSON.stringify(leadInfo, null, 2)}

${conversationHistory.length > 0 ? `Previous Conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}

` : ''}Write a professional, friendly email response. Keep it brief and conversational.`;

    // Log if slots are available
    if (availableSlots && availableSlots.length > 0) {
      this.logger.log(`📅 Passing ${availableSlots.length} calendar slots to AI`);
      this.logger.debug(`Slots: ${availableSlots.map(s => s.formatted).join(', ')}`);
    } else {
      this.logger.debug('No calendar slots available for AI');
    }

    const generatedBody = await this.callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
    });

    // Check if customer is requesting booking
    const bookingKeywords = ['schedule', 'book', 'appointment', 'visit', 'meeting', 'consultation', 'come out', 'stop by', 'available'];
    const bookingRequested = bookingKeywords.some(keyword => 
      inboundMessage.toLowerCase().includes(keyword)
    );

    // Check if customer is requesting a quote
    const quoteKeywords = ['quote', 'estimate', 'price', 'pricing', 'cost', 'how much', 'what would', 'charge', 'rate', 'budget'];
    const quoteRequested = quoteKeywords.some(keyword => 
      inboundMessage.toLowerCase().includes(keyword)
    );

    if (quoteRequested) {
      this.logger.log('💰 Quote request detected in email');
    }

    // Check if customer is confirming a specific time slot
    const confirmationKeywords = ['works for me', 'sounds good', 'perfect', 'that works', "i'll take", 'book that', 'confirm', 'yes', 'okay', 'ok'];
    const hasTimeReference = /\d{1,2}:\d{2}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|december|january/i.test(inboundMessage);
    const timeConfirmed = availableSlots && availableSlots.length > 0 && 
                          confirmationKeywords.some(keyword => inboundMessage.toLowerCase().includes(keyword)) &&
                          hasTimeReference;

    let confirmedSlot = null;
    if (timeConfirmed) {
      this.logger.log('⏰ Time confirmation detected! Searching for matching slot...');
      this.logger.debug(`Message: ${inboundMessage}`);
      
      // Try to match the confirmed time with available slots
      for (const slot of availableSlots) {
        const slotDate = new Date(slot.start);
        const dateStr = slotDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const timeStr = slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        this.logger.debug(`Checking slot: ${slot.formatted} (${dateStr} at ${timeStr})`);
        
        if (inboundMessage.toLowerCase().includes(dateStr.toLowerCase()) || 
            inboundMessage.toLowerCase().includes(timeStr.toLowerCase()) ||
            slot.formatted.toLowerCase().split(' ').some(word => inboundMessage.toLowerCase().includes(word))) {
          confirmedSlot = slot;
          this.logger.log(`✅ Matched slot: ${slot.formatted}`);
          break;
        }
      }
      
      if (!confirmedSlot) {
        this.logger.warn('⚠️ Could not match confirmed time to any available slot');
      }
    }

    // Determine if manual approval is needed
    const needsApproval = this.shouldRequireApproval(inboundMessage, leadInfo);
    
    // Calculate confidence based on lead info completeness
    const confidence = this.calculateResponseConfidence(leadInfo, inboundMessage);

    // Generate subject line for reply (Re: ...)
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    return {
      subject: replySubject,
      body: generatedBody,
      needsApproval,
      confidence,
      bookingRequested,
      confirmedSlot,
      quoteRequested,
    };
  }

  private shouldRequireApproval(message: string, leadInfo: any): boolean {
    // ALWAYS require approval for now (safest approach)
    // You can customize this later to auto-send certain types of responses
    return true;
    
    /* Original logic - uncomment and modify when ready for auto-send:
    const lowerMessage = message.toLowerCase();
    
    const sensitiveKeywords = [
      'complaint',
      'urgent',
      'emergency',
      'refund',
      'cancel',
      'lawyer',
      'legal',
      'sue',
      'angry',
      'frustrated',
      'disappointed',
    ];

    const hasSensitiveContent = sensitiveKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    const isHighPriority = leadInfo.priority === 'high';
    const isExistingCustomer = leadInfo.stage === 'customer' || leadInfo.stage === 'completed';

    return hasSensitiveContent || isHighPriority || isExistingCustomer;
    */
  }

  private calculateResponseConfidence(leadInfo: any, message: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if we have more lead info
    if (leadInfo.name) confidence += 0.1;
    if (leadInfo.phone) confidence += 0.1;
    if (leadInfo.address) confidence += 0.1;
    if (leadInfo.serviceType) confidence += 0.1;

    // Decrease confidence for complex/long messages
    if (message.length > 1000) confidence -= 0.1;
    if (message.split('?').length > 3) confidence -= 0.1; // Many questions

    return Math.max(0.2, Math.min(0.95, confidence));
  }

  async generateQuote(prompt: string, businessType?: string, conversationHistory?: any[]): Promise<any> {
    const conversationContext = conversationHistory && conversationHistory.length > 0
      ? `\n\nRecent conversation with customer:\n${conversationHistory.map(msg => 
          `${msg.direction === 'inbound' ? 'Customer' : 'You'}: ${msg.content}`
        ).join('\n')}`
      : '';

    const systemPrompt = `You are an expert ${businessType || 'contractor'} estimator. Generate a detailed, professional quote based on the customer's request.

Guidelines:
- Break down the work into clear line items
- Use realistic pricing for ${businessType || 'contracting'} services
- Include labor and materials separately when appropriate
- Be specific with quantities and units
- Round prices to reasonable amounts
- Add a professional title and description
- Tax rate is always 13%
- Consider standard industry markup (20-40% on materials, hourly rates for labor)

Return ONLY valid JSON in this exact format:
{
  "title": "Project title",
  "description": "Brief professional description of the work",
  "notes": "Any special notes or terms",
  "taxRate": 13,
  "items": [
    {
      "description": "Detailed item description",
      "quantity": 1,
      "unitPrice": 100.00
    }
  ]
}`;

    const userPrompt = `Generate a quote for: ${prompt}${conversationContext}`;

    try {
      const response = await this.callAI({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.7,
      });

      // Clean up the response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const quoteData = JSON.parse(cleanedResponse);
      
      // Validate the structure
      if (!quoteData.items || !Array.isArray(quoteData.items) || quoteData.items.length === 0) {
        throw new Error('Invalid quote structure generated');
      }

      // Ensure all items have required fields
      quoteData.items = quoteData.items.map((item: any) => ({
        description: item.description || 'Service',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      }));

      return quoteData;
    } catch (error) {
      this.logger.error('Failed to generate quote with AI:', error);
      // Return a basic template if AI fails
      return {
        title: 'Custom Quote',
        description: prompt,
        notes: '',
        taxRate: 13,
        items: [
          {
            description: 'Service - Please review and adjust',
            quantity: 1,
            unitPrice: 0,
          }
        ],
      };
    }
  }
}
