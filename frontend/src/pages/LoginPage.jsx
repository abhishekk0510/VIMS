import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

/* ─────────────────────────────────────────────────────────────────
   Natsu Dragneel  –  suit & coat, BLACK hair
   Face tracking: head rotates, all features shift with perspective,
   ears shrink/grow, pupils track cursor.  Smooth via lerp rAF.
───────────────────────────────────────────────────────────────── */
function NatsuDragneel({ mousePos }) {
  const ref        = useRef(null);
  const targetRef  = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef     = useRef(null);
  const [t, setT]  = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = e => {
      if (!ref.current) return;
      const r  = ref.current.getBoundingClientRect();
      const hx = r.left + r.width  / 2;
      const hy = r.top  + r.height * 0.21;
      targetRef.current = {
        x: Math.max(-1, Math.min(1, (e.clientX - hx) / 420)),
        y: Math.max(-1, Math.min(1, (e.clientY - hy) / 320)),
      };
    };
    window.addEventListener('mousemove', onMove);

    const tick = () => {
      const L = 0.10;
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * L;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * L;
      setT({ x: currentRef.current.x, y: currentRef.current.y });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { x: tx, y: ty } = t;

  const HR  = tx * 17;           // head rotation (deg)
  const FSX = tx * 8;            // face-feature shift X
  const FSY = ty * 5;            // face-feature shift Y
  const PX  = FSX + tx * 3;     // pupil X (feature shift + extra iris move)
  const PY  = FSY + ty * 2;     // pupil Y
  const NX  = FSX * 0.75;       // nose X
  const NY  = FSY * 0.75;
  const MX  = FSX * 0.55;       // mouth X
  const MY  = FSY * 0.55;
  const BX  = FSX * 0.90;       // brow X
  const BY  = FSY * 0.90;

  // Ear shrinks on the side turning away
  const leftEarRX  = Math.max(1.5, 7 * (1 - Math.max(0, tx) * 1.45));
  const rightEarRX = Math.max(1.5, 7 * (1 + Math.min(0, tx) * 1.45));

  return (
    <div
      ref={ref}
      style={{
        width: '260px',
        userSelect: 'none',
        pointerEvents: 'none',
        animation: 'floatChar 4s ease-in-out infinite',
        filter: 'drop-shadow(0 10px 36px rgba(0,0,0,0.55))',
      }}
    >
      <svg viewBox="0 0 220 460" xmlns="http://www.w3.org/2000/svg" width="100%">

        {/* ══════════════════════════ BODY ══════════════════════════ */}

        {/* Coat tails */}
        <path d="M64 242 Q50 345 48 440 L74 440 Q76 345 85 272Z" fill="#0e0e1f" />
        <path d="M156 242 Q170 345 172 440 L146 440 Q144 345 135 272Z" fill="#0e0e1f" />

        {/* Long coat body */}
        <path d="M60 212 Q56 285 56 365 L164 365 Q164 285 160 212Z" fill="#18182e" />

        {/* Suit jacket */}
        <path d="M70 208 L80 365 L140 365 L150 208 Q136 197 110 197 Q84 197 70 208Z" fill="#0c2850" />

        {/* Coat lapels */}
        <path d="M110 208 L86 240 L95 208Z" fill="#18182e" />
        <path d="M110 208 L134 240 L125 208Z" fill="#18182e" />

        {/* White shirt */}
        <path d="M97 208 L110 226 L123 208" fill="#eeeef8" />

        {/* Tie — flame red */}
        <path d="M110 212 L104 256 L110 266 L116 256Z" fill="#d42800" />
        <ellipse cx="110" cy="212" rx="5.5" ry="3.5" fill="#aa2000" />

        {/* Coat buttons */}
        <circle cx="110" cy="276" r="2.8" fill="#08081a" />
        <circle cx="110" cy="298" r="2.8" fill="#08081a" />
        <circle cx="110" cy="320" r="2.8" fill="#08081a" />

        {/* Pocket square */}
        <path d="M130 226 L139 226 L137 236 L132 236Z" fill="#e8e8f8" />
        <path d="M130 226 L134 219 L139 226Z" fill="white" />

        {/* FT guild badge */}
        <circle cx="90" cy="235" r="8" fill="#0c2850" stroke="#4080c0" strokeWidth="1.2" />
        <text x="90" y="239" textAnchor="middle" fill="#70b0e0" fontSize="7" fontWeight="bold">FT</text>

        {/* LEFT ARM */}
        <path d="M70 215 Q48 248 46 302 Q56 308 65 301 Q68 260 82 225Z" fill="#0c2850" />
        <path d="M46 282 Q42 312 44 322 Q55 328 66 320 Q64 306 64 296Z" fill="#18182e" />
        <ellipse cx="48" cy="326" rx="9" ry="11" fill="#e89060" />

        {/* RIGHT ARM */}
        <path d="M150 215 Q172 248 174 302 Q164 308 155 301 Q152 260 138 225Z" fill="#0c2850" />
        <path d="M174 282 Q178 312 176 322 Q165 328 154 320 Q156 306 156 296Z" fill="#18182e" />
        <ellipse cx="172" cy="326" rx="9" ry="11" fill="#e89060" />

        {/* LEGS */}
        <path d="M82 363 Q76 405 74 440 L92 440 Q95 405 96 363Z" fill="#090f18" />
        <path d="M138 363 Q144 405 146 440 L128 440 Q125 405 124 363Z" fill="#090f18" />
        <ellipse cx="82"  cy="441" rx="15" ry="7" fill="#060606" />
        <ellipse cx="138" cy="441" rx="15" ry="7" fill="#060606" />

        {/* ══════════════ NATSU'S SCALE SCARF ══════════════ */}
        <path
          d="M80 180 Q95 190 110 188 Q125 190 140 180 Q144 198 140 202 Q125 210 110 208 Q95 210 80 202 Q76 198 80 180Z"
          fill="#f4ede0"
        />
        {[87,95,103,111,119,127].map((x, i) => (
          <path key={i}
            d={`M${x} ${i%2===0?187:185} Q${x+3.5} ${i%2===0?183:181} ${x+7} ${i%2===0?187:185} Q${x+3.5} ${i%2===0?191:189} ${x} ${i%2===0?187:185}Z`}
            fill="#d8cdb8"
          />
        ))}
        <path d="M80 192 Q110 201 140 192" stroke="#c8bda8" strokeWidth="0.9" fill="none" />
        <path d="M81 197 Q110 205 139 197" stroke="#c8bda8" strokeWidth="0.9" fill="none" />

        {/* NECK */}
        <rect x="102" y="164" width="16" height="22" rx="5" fill="#e89060" />

        {/* ══════════════ HEAD GROUP (rotates toward cursor) ══════════════ */}
        <g
          style={{
            transform: `rotate(${HR}deg)`,
            transformBox: 'fill-box',
            transformOrigin: 'center 88%',
            transition: 'transform 0.05s linear',
          }}
        >
          {/* ── HAIR BACK LAYER ── */}
          <path d="M74 112 L56 54 L76 46 L88 98Z"    fill="#111111" />
          <path d="M86 104 L74 42 L96 36 L100 92Z"   fill="#1a1a1a" />
          <path d="M102 100 L96 30 L118 28 L116 90Z" fill="#111111" />
          <path d="M122 102 L134 40 L152 48 L140 96Z"fill="#1a1a1a" />
          <path d="M138 110 L156 56 L170 68 L150 114Z"fill="#111111"/>
          <path d="M62 118 L46 76 L60 70 L72 110Z"   fill="#111111" />
          <path d="M152 120 L168 78 L158 70 L148 112Z"fill="#111111"/>
          {/* Hair base */}
          <path
            d="M66 158 Q64 118 70 104 Q84 82 110 82 Q136 82 150 104 Q157 118 154 158Z"
            fill="#1a1a1a"
          />

          {/* ── LEFT EAR ── */}
          <ellipse cx="68" cy="122" rx={leftEarRX} ry="9" fill="#e89060" />
          {leftEarRX > 3 && (
            <ellipse cx="68" cy="122" rx={leftEarRX * 0.48} ry="5.5" fill="#d47848" />
          )}

          {/* ── RIGHT EAR ── */}
          <ellipse cx="152" cy="122" rx={rightEarRX} ry="9" fill="#e89060" />
          {rightEarRX > 3 && (
            <ellipse cx="152" cy="122" rx={rightEarRX * 0.48} ry="5.5" fill="#d47848" />
          )}

          {/* ── FACE ── */}
          <ellipse cx="110" cy="122" rx="42" ry="46" fill="#e89060" />
          {/* Jaw shadow */}
          <path d="M80 148 Q110 162 140 148 Q130 170 110 172 Q90 170 80 148Z"
                fill="#d47848" opacity="0.35" />

          {/* ── FRONT HAIR SPIKES ── */}
          <path d="M70 108 L58 56 L78 50 L84 104Z"   fill="#1c1c1c" />
          <path d="M84 100 L76 44 L98 40 L98 94Z"    fill="#242424" />
          <path d="M100 96 L96 28 L118 26 L116 90Z"  fill="#1c1c1c" />
          <path d="M120 96 L132 38 L150 46 L138 92Z" fill="#242424" />
          <path d="M136 102 L154 54 L166 66 L148 106Z"fill="#1c1c1c"/>
          {/* Forehead hair */}
          <path d="M78 98 Q90 84 110 82 Q130 84 142 98" fill="#1c1c1c" />
          <path d="M80 98 Q87 87 94 94"  fill="#111111" />
          <path d="M140 98 Q133 87 126 94" fill="#111111" />
          {/* Hair shine */}
          <path d="M98 36 Q110 26 122 36"
                stroke="#444444" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round"/>

          {/* ── EYEBROWS ── */}
          <path d={`M${82+BX} ${86+BY} Q${92+BX} ${80+BY} ${102+BX} ${83+BY}`}
                stroke="#1e0800" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d={`M${118+BX} ${83+BY} Q${128+BX} ${80+BY} ${138+BX} ${86+BY}`}
                stroke="#1e0800" strokeWidth="3.2" fill="none" strokeLinecap="round" />

          {/* ── LEFT EYE ── */}
          <ellipse cx={91+FSX}  cy={101+FSY} rx="10.5" ry="11.5" fill="white" />
          <path d={`M${80+FSX} ${97+FSY} Q${91+FSX} ${91+FSY} ${102+FSX} ${97+FSY}`}
                fill="#d47040" opacity="0.4" />
          <ellipse cx={91+PX}  cy={101+PY} rx="7"   ry="7.5" fill="#3d1800" />
          <ellipse cx={91+PX}  cy={101+PY} rx="4"   ry="4.5" fill="#0a0500" />
          <ellipse cx={88.5+PX} cy={97.5+PY} rx="2"  ry="2"   fill="white" opacity="0.92" />
          <ellipse cx={93.5+PX} cy={102+PY}  rx="1.1" ry="1.1" fill="white" opacity="0.50" />
          <path d={`M${80+FSX} ${96+FSY} Q${91+FSX} ${88+FSY} ${102+FSX} ${96+FSY}`}
                stroke="#1e0800" strokeWidth="1.8" fill="none" />
          <path d={`M${81+FSX} ${110+FSY} Q${91+FSX} ${116+FSY} ${101+FSX} ${110+FSY}`}
                stroke="#c47848" strokeWidth="1.1" fill="none" />

          {/* ── RIGHT EYE ── */}
          <ellipse cx={129+FSX} cy={101+FSY} rx="10.5" ry="11.5" fill="white" />
          <path d={`M${118+FSX} ${97+FSY} Q${129+FSX} ${91+FSY} ${140+FSX} ${97+FSY}`}
                fill="#d47040" opacity="0.4" />
          <ellipse cx={129+PX} cy={101+PY} rx="7"   ry="7.5" fill="#3d1800" />
          <ellipse cx={129+PX} cy={101+PY} rx="4"   ry="4.5" fill="#0a0500" />
          <ellipse cx={126.5+PX} cy={97.5+PY} rx="2"  ry="2"   fill="white" opacity="0.92" />
          <ellipse cx={131.5+PX} cy={102+PY}  rx="1.1" ry="1.1" fill="white" opacity="0.50" />
          <path d={`M${118+FSX} ${96+FSY} Q${129+FSX} ${88+FSY} ${140+FSX} ${96+FSY}`}
                stroke="#1e0800" strokeWidth="1.8" fill="none" />
          <path d={`M${119+FSX} ${110+FSY} Q${129+FSX} ${116+FSY} ${139+FSX} ${110+FSY}`}
                stroke="#c47848" strokeWidth="1.1" fill="none" />

          {/* ── NOSE ── */}
          <path d={`M${106+NX} ${122+NY} Q${110+NX} ${130+NY} ${114+NX} ${122+NY}`}
                stroke="#bf6a30" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* ── MOUTH — wide confident grin with teeth ── */}
          <path d={`M${93+MX} ${143+MY} Q${110+MX} ${150+MY} ${127+MX} ${143+MY}
                    Q${127+MX} ${152+MY} ${110+MX} ${153+MY}
                    Q${93+MX}  ${152+MY} ${93+MX}  ${143+MY}Z`}
                fill="white" opacity="0.65" />
          <path d={`M${96+MX} ${140+MY} Q${104+MX} ${137+MY} ${110+MX} ${140+MY}
                    Q${116+MX} ${137+MY} ${124+MX} ${140+MY}`}
                stroke="#bf6a30" strokeWidth="1.2" fill="none" />
          <path d={`M${91+MX} ${142+MY} Q${110+MX} ${153+MY} ${129+MX} ${142+MY}`}
                stroke="#7a3010" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d={`M${98+MX} ${148+MY} Q${110+MX} ${154+MY} ${122+MX} ${148+MY}`}
                stroke="#c47848" strokeWidth="1.3" fill="none" strokeLinecap="round" />

          {/* ── BLUSH ── */}
          <ellipse cx={76+FSX*0.4}  cy={132+FSY*0.4} rx="11" ry="6" fill="#ff8868" opacity="0.28" />
          <ellipse cx={144+FSX*0.4} cy={132+FSY*0.4} rx="11" ry="6" fill="#ff8868" opacity="0.28" />

          {/* Chin crease */}
          <path d="M94 160 Q110 167 126 160" stroke="#c47848" strokeWidth="0.9" fill="none" opacity="0.45" />
        </g>

      </svg>
    </div>
  );
}

/* ── Floating particles ── */
function Particles() {
  const list = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      id: i, sz: 3 + Math.random() * 8, x: Math.random() * 100,
      del: Math.random() * 8, dur: 7 + Math.random() * 10, op: 0.06 + Math.random() * 0.16,
    }))
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {list.current.map(p => (
        <div key={p.id} style={{
          position: 'absolute', bottom: '-24px', left: `${p.x}%`,
          width: `${p.sz}px`, height: `${p.sz}px`, borderRadius: '50%',
          background: 'white', opacity: p.op,
          animation: `floatUp ${p.dur}s ${p.del}s linear infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── Login Page ── */
export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [mousePos, setMousePos] = useState(null);

  useEffect(() => {
    const h = e => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes floatChar {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-16px); }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0);      opacity: inherit; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        @keyframes bgShift {
          0%   { background-position: 0%   50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0%   50%; }
        }
        @keyframes cardGlow {
          0%,100% { box-shadow: 0 25px 60px rgba(0,0,0,.45), 0 0 40px 6px  rgba(80,140,255,.10); }
          50%      { box-shadow: 0 25px 60px rgba(0,0,0,.45), 0 0 60px 14px rgba(80,140,255,.18); }
        }
      `}</style>

      <div style={{
        minHeight: '100vh', overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg,#0f0c29,#1c1a50,#0f3460,#16213e,#0f0c29)',
        backgroundSize: '400% 400%', animation: 'bgShift 14s ease infinite',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      }}>
        <Particles />

        {/* Ambient orbs */}
        <div style={{ position:'absolute', top:'8%', left:'12%', width:'320px', height:'320px',
          borderRadius:'50%', background:'radial-gradient(circle,rgba(30,80,220,.16) 0%,transparent 70%)',
          pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'12%', right:'12%', width:'260px', height:'260px',
          borderRadius:'50%', background:'radial-gradient(circle,rgba(220,40,80,.13) 0%,transparent 70%)',
          pointerEvents:'none' }} />

        {/* Centred two-column layout */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: '48px', width: '100%', maxWidth: '860px',
          position: 'relative', zIndex: 10,
        }}>

          {/* Login card */}
          <div style={{ flex: '0 0 400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>

              {/* 3SC Brand Logo */}
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{
                  display: 'inline-block', background: 'white', borderRadius: '12px',
                  padding: '10px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}>
                  <img
                    src="/3sc-logo.jpeg"
                    alt="3SC Supply Chain Solutions"
                    style={{ height: '72px', width: 'auto', display: 'block' }}
                  />
                </div>
              </div>

<h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: 0 }}>VIMS</h1>
              <p style={{ color: '#a8c8f0', marginTop: '4px', fontSize: '.88rem' }}>
                Vendor Invoice Management System
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,.97)', borderRadius: '20px',
              padding: '2.2rem', animation: 'cardGlow 4s ease-in-out infinite',
            }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1.4rem' }}>
                Sign in to your account
              </h2>

              {error && (
                <div style={{
                  marginBottom: '1rem', padding: '.75rem 1rem',
                  background: '#fff5f5', border: '1px solid #fed7d7',
                  borderRadius: '10px', fontSize: '.85rem', color: '#c53030',
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label className="label">Email address</label>
                  <input type="email" className="input" placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    required autoComplete="email" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} className="input pr-10"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      required autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

            </div>
          </div>

          {/* Natsu */}
          <div style={{ flex: '0 0 260px', alignSelf: 'flex-end' }}>
            <NatsuDragneel mousePos={mousePos} />
          </div>

        </div>
      </div>
    </>
  );
}
