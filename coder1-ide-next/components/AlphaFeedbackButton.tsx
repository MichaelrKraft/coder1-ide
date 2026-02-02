'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Bug, Lightbulb, X, Send, CheckCircle, AlertCircle } from 'lucide-react';

type FeedbackType = 'bug' | 'feature' | 'general';

interface FeedbackData {
  type: FeedbackType;
  message: string;
  email?: string;
  context: {
    url: string;
    userAgent: string;
    timestamp: string;
    screenSize: string;
    sessionId?: string;
  };
}

export default function AlphaFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMessage('');
        setFeedbackType('bug');
        setSubmitStatus('idle');
        setErrorMessage('');
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setErrorMessage('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const feedbackData: FeedbackData = {
      type: feedbackType,
      message: message.trim(),
      email: email.trim() || undefined,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
        screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
        sessionId: typeof localStorage !== 'undefined' ? localStorage.getItem('ide-terminalSessionId') || undefined : undefined,
      },
    };

    try {
      const response = await fetch('/api/alpha-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitStatus('success');

      // Close modal after showing success
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
      setErrorMessage('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    { type: 'bug' as FeedbackType, icon: Bug, label: 'Bug Report', color: 'text-red-400' },
    { type: 'feature' as FeedbackType, icon: Lightbulb, label: 'Feature Request', color: 'text-yellow-400' },
    { type: 'general' as FeedbackType, icon: MessageSquare, label: 'General Feedback', color: 'text-coder1-cyan' },
  ];

  return (
    <>
      {/* Floating Button - Black with glowing orange border */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-2 right-4 z-40 flex items-center gap-1.5 px-2.5 py-1.5 bg-black text-orange-400 text-xs font-medium rounded-md border border-orange-500/60 hover:border-orange-400 hover:text-orange-300 transition-all duration-200"
        style={{
          boxShadow: '0 0 8px rgba(249, 115, 22, 0.4), 0 0 2px rgba(249, 115, 22, 0.2)',
        }}
        title="Send Alpha Feedback"
      >
        <MessageSquare className="w-3 h-3" />
        <span>Feedback</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          {/* Modal Content */}
          <div
            className="w-full max-w-md bg-bg-secondary border border-border-default rounded-xl shadow-2xl overflow-hidden transform transition-all duration-200 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-bg-tertiary">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Alpha Feedback</h2>
                  <p className="text-xs text-text-muted">Help us improve Coder1</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success State */}
            {submitStatus === 'success' ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Thank You!</h3>
                <p className="text-sm text-text-secondary">
                  Your feedback has been submitted. We appreciate you helping us improve Coder1!
                </p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Feedback Type Selector */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    What type of feedback?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {feedbackTypes.map(({ type, icon: Icon, label, color }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFeedbackType(type)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                          feedbackType === type
                            ? 'border-coder1-cyan bg-coder1-cyan/10'
                            : 'border-border-default hover:border-border-highlight hover:bg-bg-tertiary'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${feedbackType === type ? color : 'text-text-muted'}`} />
                        <span className={`text-xs ${feedbackType === type ? 'text-text-primary' : 'text-text-muted'}`}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    {feedbackType === 'bug' ? 'Describe the bug' :
                     feedbackType === 'feature' ? 'Describe your idea' :
                     'Your feedback'}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      feedbackType === 'bug'
                        ? "What happened? What did you expect? Steps to reproduce..."
                        : feedbackType === 'feature'
                        ? "What feature would you like to see? How would it help you?"
                        : "Share your thoughts, suggestions, or questions..."
                    }
                    className="w-full h-32 px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-coder1-cyan transition-colors"
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-2">
                    Email <span className="text-text-muted">(optional, for follow-up)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-coder1-cyan transition-colors"
                  />
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-400">{errorMessage}</span>
                  </div>
                )}

                {/* Context Info */}
                <div className="p-3 bg-bg-tertiary rounded-lg">
                  <p className="text-xs text-text-muted">
                    <span className="text-text-secondary">Auto-captured:</span> Current page, browser info, screen size, and timestamp will be included to help us debug issues.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-coder1-cyan hover:bg-coder1-cyan/90 disabled:bg-bg-tertiary disabled:text-text-muted text-black font-medium rounded-lg transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </>
  );
}
