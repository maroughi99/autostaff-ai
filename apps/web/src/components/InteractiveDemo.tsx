'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Bot, CheckCircle, Calendar, FileText, ArrowRight } from 'lucide-react';

type DemoStep = 'inbox' | 'ai-response' | 'lead-created' | 'quote' | 'calendar';

export default function InteractiveDemo() {
  const [currentStep, setCurrentStep] = useState<DemoStep>('inbox');
  const [isAnimating, setIsAnimating] = useState(false);

  const steps: { id: DemoStep; label: string }[] = [
    { id: 'inbox', label: 'New Email Arrives' },
    { id: 'ai-response', label: 'AI Generates Response' },
    { id: 'lead-created', label: 'Lead Auto-Created' },
    { id: 'quote', label: 'Quote Generated' },
    { id: 'calendar', label: 'Appointment Booked' },
  ];

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const currentIndex = steps.findIndex(s => s.id === currentStep);
      const nextIndex = (currentIndex + 1) % steps.length;
      setCurrentStep(steps[nextIndex].id);
      setIsAnimating(false);
    }, 300);
  };

  const handleStepClick = (stepId: DemoStep) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(stepId);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Step Indicator */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => handleStepClick(step.id)}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
              currentStep === step.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {index + 1}. {step.label}
          </button>
        ))}
      </div>

      {/* Demo Window */}
      <div
        className={`bg-card border rounded-lg overflow-hidden transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Browser Header */}
        <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 text-center text-sm text-muted-foreground">
            AutoStaff AI Dashboard
          </div>
        </div>

        {/* Demo Content */}
        <div className="p-6 md:p-8 min-h-[400px]">
          {currentStep === 'inbox' && <InboxStep />}
          {currentStep === 'ai-response' && <AIResponseStep />}
          {currentStep === 'lead-created' && <LeadCreatedStep />}
          {currentStep === 'quote' && <QuoteStep />}
          {currentStep === 'calendar' && <CalendarStep />}
        </div>

        {/* Navigation */}
        <div className="border-t p-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Step {steps.findIndex(s => s.id === currentStep) + 1} of {steps.length}
          </div>
          <Button onClick={handleNext} size="sm">
            Next Step <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InboxStep() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-start gap-3 mb-4">
        <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">john.smith@gmail.com</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">NEW</span>
          </div>
          <div className="text-sm text-muted-foreground mb-3">
            Subject: Need HVAC quote for 3-story building
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm mb-2">Hi there,</p>
            <p className="text-sm mb-2">
              I'm looking for a quote to install a new HVAC system in my 3-story office building located at 123 Main St, Denver. The building is about 5,000 sq ft.
            </p>
            <p className="text-sm mb-2">
              Can you provide pricing and schedule a consultation? I'd prefer early next week if possible.
            </p>
            <p className="text-sm">Thanks!</p>
          </div>
        </div>
      </div>
      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 text-primary">
          <Bot className="h-5 w-5" />
          <span className="font-medium">AI is analyzing this email...</span>
        </div>
      </div>
    </div>
  );
}

function AIResponseStep() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-start gap-3 mb-6">
        <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
        <div className="flex-1">
          <div className="font-semibold mb-2">AI Generated Response</div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm mb-2">Hi John,</p>
            <p className="text-sm mb-2">
              Thank you for reaching out! I'd be happy to help you with your HVAC installation project.
            </p>
            <p className="text-sm mb-2">
              For a 5,000 sq ft 3-story building, I'll need to schedule an on-site consultation to provide an accurate quote. Based on similar projects, you can expect a range of $25,000-$35,000 depending on the system specifications.
            </p>
            <p className="text-sm mb-2">
              I have availability early next week:
              <br />• Monday, Dec 23rd at 9:00 AM or 2:00 PM
              <br />• Tuesday, Dec 24th at 10:00 AM
            </p>
            <p className="text-sm">
              Would any of these times work for you?
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Response sent automatically in 3 seconds</span>
      </div>
    </div>
  );
}

function LeadCreatedStep() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <h3 className="text-lg font-semibold">Lead Automatically Created</h3>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b font-medium text-sm">
          Lead Details
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <div className="font-medium">John Smith</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Email</div>
              <div className="font-medium">john.smith@gmail.com</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Address</div>
            <div className="font-medium">123 Main St, Denver, CO</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Service Type</div>
            <div className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
              HVAC Installation
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Project Details</div>
            <div className="text-sm">3-story office building, 5,000 sq ft</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Stage</div>
            <div className="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium">
              Consultation Scheduled
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Estimated Value</div>
            <div className="font-medium text-green-600">$25,000 - $35,000</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteStep() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold">Professional Quote Generated</h3>
      </div>
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <div className="text-2xl font-bold mb-1">Your Business Name</div>
          <div className="text-sm opacity-90">Professional HVAC Services</div>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-1">QUOTE FOR</div>
            <div className="font-medium">John Smith</div>
            <div className="text-sm">123 Main St, Denver, CO</div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">HVAC System Installation</div>
                <div className="text-sm text-muted-foreground">3-story building, 5,000 sq ft</div>
              </div>
              <div className="font-medium">$28,500</div>
            </div>
            <div className="flex justify-between text-sm">
              <div>Labor & Installation</div>
              <div>$8,500</div>
            </div>
            <div className="flex justify-between text-sm">
              <div>Equipment & Materials</div>
              <div>$20,000</div>
            </div>
          </div>
          <div className="border-t mt-4 pt-4 flex justify-between items-center">
            <div className="font-bold text-lg">Total</div>
            <div className="font-bold text-2xl text-green-600">$28,500</div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Valid for 30 days • Payment terms: 50% deposit, 50% on completion
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="h-4 w-4" />
        <span>Quote automatically sent to john.smith@gmail.com</span>
      </div>
    </div>
  );
}

function CalendarStep() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold">Appointment Automatically Booked</h3>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-3 border-b">
          <div className="text-lg font-semibold">December 2025</div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-4 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const date = i - 0;
              const isToday = date === 20;
              const isBooked = date === 23;
              return (
                <div
                  key={i}
                  className={`aspect-square flex items-center justify-center text-sm rounded-lg ${
                    date < 1 || date > 31
                      ? 'text-muted-foreground/30'
                      : isBooked
                      ? 'bg-primary text-primary-foreground font-semibold ring-2 ring-primary ring-offset-2'
                      : isToday
                      ? 'bg-muted font-medium'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {date >= 1 && date <= 31 ? date : ''}
                </div>
              );
            })}
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold">
                23
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-1">HVAC Consultation</div>
                <div className="text-sm text-muted-foreground mb-2">
                  Monday, December 23, 2025 at 9:00 AM
                </div>
                <div className="text-sm">
                  <div className="font-medium">John Smith</div>
                  <div className="text-muted-foreground">john.smith@gmail.com</div>
                  <div className="text-muted-foreground">123 Main St, Denver, CO</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Calendar invitation sent to john.smith@gmail.com</span>
        </div>
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Reminder scheduled for 24 hours before appointment</span>
        </div>
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Synced with Google Calendar</span>
        </div>
      </div>
    </div>
  );
}
