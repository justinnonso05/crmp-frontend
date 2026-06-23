'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { SURVEYS } from '@/lib/endpoints';

export default function PublicSurveyPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!surveyId) return;

    apiFetch<any>(SURVEYS.DETAIL(surveyId))
      .then(data => {
        setSurvey(data.survey);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load survey or it does not exist.');
        setLoading(false);
      });
  }, [surveyId]);

  const handleChange = (questionId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter((o: string) => o !== option) };
      }
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await apiFetch(SURVEYS.SUBMIT_RESPONSE(surveyId), {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit response.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-shell)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading Survey...</p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-shell)' }}>
        <div className="dash-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <span style={{ fontSize: '2rem', color: 'var(--error)' }}>⚠</span>
          <h2 style={{ marginTop: '1rem', color: 'var(--error)' }}>Survey Not Found</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>{error || 'This survey may have been deleted or the link is incorrect.'}</p>
        </div>
      </div>
    );
  }

  if (!survey.isActive) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-shell)' }}>
        <div className="dash-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>🔒</span>
          <h2 style={{ marginTop: '1rem' }}>Survey Closed</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>This survey is no longer accepting responses.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-shell)' }}>
        <div className="dash-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(5, 150, 105, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem' }}>
            ✓
          </div>
          <h2>Thank You!</h2>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Your response has been recorded successfully.</p>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>You may now close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-shell)', padding: '2rem' }}>
      <main style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="dash-card" style={{ padding: '2rem', marginBottom: '2rem', borderTop: '6px solid var(--primary)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{survey.title}</h1>
          <p style={{ color: 'var(--text-muted)' }}>Anonymous Research Survey</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {survey.schemaJson.questions.map((q: any, i: number) => (
            <div key={q.id} className="dash-card" style={{ padding: '2rem' }}>
              <label style={{ display: 'block', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                {i + 1}. {q.question}
              </label>

              {q.type === 'SHORT_TEXT' && (
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder="Your answer"
                  value={answers[q.id] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                />
              )}

              {q.type === 'LONG_TEXT' && (
                <textarea 
                  className="auth-input" 
                  placeholder="Your answer"
                  rows={2}
                  value={answers[q.id] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  style={{ 
                    resize: 'vertical',
                    background: 'transparent',
                    padding: '0.5rem 0'
                  }}
                />
              )}

              {q.type === 'RADIO' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {q.options.map((opt: string, optIndex: number) => (
                    <label key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name={`radio_${q.id}`} 
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleChange(q.id, opt)}
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '1rem' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'CHECKBOX' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {q.options.map((opt: string, optIndex: number) => {
                    const isChecked = Array.isArray(answers[q.id]) && answers[q.id].includes(opt);
                    return (
                      <label key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(q.id, opt, e.target.checked)}
                          style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }}
                        />
                        <span style={{ fontSize: '1rem' }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="dash-btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Responses'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
