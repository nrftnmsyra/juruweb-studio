'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { MdGroup, MdContentCopy, MdCheck, MdRefresh, MdKey, MdDescription } from 'react-icons/md';
import ConfirmSubmit from '@/components/ConfirmSubmit';
import {
  provisionMembers,
  listMembers,
  addMember,
  removeMember,
  resetMemberPassword,
} from './memberActions';

/**
 * Written for whoever builds the client's own dashboard, human or agent. The
 * lockdown migration closed anon write access, so their existing code stops
 * working the moment we hand them users, and the fix is not guessable from the
 * error. This is the text that explains it.
 */
function handoffNote(schema, projectRef, label) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co';

  return `${label} admin dashboard, sign-in setup
From Juruweb Studio. Order ${projectRef}, Supabase schema ${schema}.

WHAT CHANGED
The anon key can no longer write anything in this schema. It kept read
access to the public website content tables, and it may still INSERT a
booking, so the public site is unaffected. Everything else now needs a
signed-in user.

HOW LOGIN WORKS
Supabase Auth, email and password. Juruweb creates the accounts, so do
not build a sign-up form. Two things have to line up:
  1. an account in auth.users          (Juruweb creates it)
  2. a row in ${schema}.members with active = true  (Juruweb adds it)
The row is what grants this dashboard. The account on its own grants
nothing, anywhere.

SETUP
  npm i @supabase/ssr @supabase/supabase-js

  NEXT_PUBLIC_SUPABASE_URL=${url}
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<the same anon key you already use>

  import { createBrowserClient } from '@supabase/ssr';

  export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { db: { schema: '${schema}' } }   // required, the data is not in public
  );

SIGN IN
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Then confirm they belong to THIS client, not merely to the project:
  const { data: allowed } = await supabase.rpc('is_member');
  if (!allowed) {
    await supabase.auth.signOut();
    // refuse, and say the account is not registered for this dashboard
  }

  Do run that check. One Supabase project means one shared auth.users, so
  a valid session proves someone can sign in, not that they are yours.

READING AND WRITING
  Signed in and a member, ordinary queries work on every table in the
  schema, with no extra filters to remember:

    await supabase.from('bookings').select('*').order('created_at');

  Without a session they return 401 permission denied. That is the new
  behaviour working, not a bug to route around.

THE MEMBERS TABLE
  ${schema}.members is readable, but a member sees only their own row, so
  use it for the signed-in person's name and role:

    await supabase.from('members').select('email, role, full_name').single();

  Adding and removing users happens in Juruweb, not in this dashboard.

JOBS WITH NOBODY SIGNED IN
  A cron, a seed script or an agent tidying data has no session, so it
  must use SUPABASE_SERVICE_ROLE_KEY, on the server only. That key
  bypasses RLS completely: never put it in the browser bundle, never
  commit it, and never send it to a URL you have not verified.

FORGOTTEN PASSWORD
  Ask Juruweb. Every user has a Reset password button in our dashboard
  that hands back a new one.`;
}

function HandoffNoteButton({ schema, projectRef, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={() => {
        navigator.clipboard?.writeText(handoffNote(schema, projectRef, label));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      title="Setup instructions for whoever builds the client's dashboard"
    >
      {copied ? <MdCheck /> : <MdDescription />}
      <span>{copied ? 'Copied' : 'Handoff note'}</span>
    </button>
  );
}

function CopyableSecret({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        marginTop: '0.7rem',
        padding: '0.7rem 0.9rem',
        borderRadius: '10px',
        background: 'var(--success-glow)',
        border: '1px solid var(--success)',
      }}
    >
      <p style={{ fontSize: '0.83rem', color: 'var(--success)', fontWeight: 600 }}>{label}</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <code
          style={{
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            fontSize: '0.84rem',
            fontWeight: 600,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.25rem 0.55rem',
            userSelect: 'all',
          }}
        >
          {value}
        </code>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? <MdCheck /> : <MdContentCopy />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          Shown once, send it to them now.
        </span>
      </div>
    </div>
  );
}

function ResetButton({ email, domain }) {
  const [state, formAction, pending] = useActionState(resetMemberPassword, null);
  return (
    <div style={{ display: 'inline-block', textAlign: 'right' }}>
      <form action={formAction}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="domain" value={domain} />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
          <MdKey />
          <span>{pending ? 'Resetting…' : 'Reset password'}</span>
        </button>
      </form>
      {state?.error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: '0.76rem', marginTop: '0.3rem' }}>
          {state.error}
        </p>
      )}
      {state?.password && <CopyableSecret label={state.ok} value={state.password} />}
    </div>
  );
}

/**
 * Who may use the admin dashboard we built for this client.
 *
 * Two things have to line up: a sign-in account in the project's shared
 * auth.users, and a row in this client's own schema. The account gets them
 * through the door; the row is what says which client they belong to.
 */
export default function ClientMembers({ domain, projectRef, siteLabel }) {
  const [addState, addAction, adding] = useActionState(addMember, null);
  const [members, setMembers] = useState(null);
  const [error, setError] = useState(null);
  const [loading, startLoad] = useTransition();

  const load = () => {
    startLoad(async () => {
      const res = await listMembers(projectRef);
      if (res.error) {
        setError(res.error);
        setMembers(null);
      } else {
        setError(null);
        setMembers(res.members);
      }
    });
  };

  useEffect(() => {
    if (projectRef) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRef, addState?.ok]);

  if (!projectRef) {
    return (
      <div className="card" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <MdGroup style={{ color: 'var(--brand-pink-hover)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Client dashboard users</span>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
          Link this website to a project above first. The client&apos;s dashboard lives in a schema
          named after its order, so without a project ref there is nothing to point at.
        </p>
      </div>
    );
  }

  const schema = projectRef.toLowerCase().replace(/[^a-z0-9]/g, '');
  const notProvisioned = members !== null && members.length === 0 && !error;

  return (
    <div className="card" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <MdGroup style={{ color: 'var(--brand-pink-hover)' }} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Client dashboard users</span>
        <span
          style={{
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
          }}
        >
          schema {schema}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <HandoffNoteButton
            schema={schema}
            projectRef={projectRef}
            label={siteLabel || domain}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={load}
            disabled={loading}
          >
            <MdRefresh />
            <span>{loading ? 'Loading…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
        Adding someone creates their sign-in account and grants them this client&apos;s dashboard,
        and nothing else. Removing them revokes this dashboard but keeps the account, since the
        same person may work for another client too. Handoff note copies the setup instructions
        for whoever builds that dashboard, which they will need: the anon key can no longer write
        to this schema, so their old code stops working and the error does not say why.
      </p>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: '0.83rem', marginTop: '0.6rem', lineHeight: 1.6 }}>
          {error}
        </p>
      )}

      <form action={addAction} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        <input type="hidden" name="project_ref" value={projectRef} />
        <input type="hidden" name="domain" value={domain} />
        <input
          id="member-email"
          name="email"
          type="email"
          required
          placeholder="person@client.com"
          className="form-input form-input--sm"
          style={{ flex: '2 1 13rem', minWidth: 0 }}
        />
        <input
          id="member-name"
          name="full_name"
          type="text"
          placeholder="Name (optional)"
          className="form-input form-input--sm"
          style={{ flex: '1 1 9rem', minWidth: 0 }}
        />
        <input
          id="member-pw"
          name="password"
          type="text"
          placeholder="Password (blank to generate)"
          className="form-input form-input--sm"
          style={{ flex: '1 1 11rem', minWidth: 0 }}
        />
        <select id="member-role" name="role" defaultValue="member" className="form-input form-input--sm" style={{ width: 'auto' }}>
          <option value="member">Member</option>
          <option value="owner">Owner</option>
        </select>
        <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
          {adding ? 'Adding…' : 'Add user'}
        </button>
      </form>

      {addState?.error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: '0.83rem', marginTop: '0.6rem' }}>
          {addState.error}
        </p>
      )}
      {addState?.ok && !addState.password && (
        <p style={{ color: 'var(--success)', fontSize: '0.83rem', marginTop: '0.6rem', fontWeight: 500 }}>
          {addState.ok}
        </p>
      )}
      {addState?.password && <CopyableSecret label={addState.ok} value={addState.password} />}

      {notProvisioned && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            background: 'var(--warning-glow)',
            border: '1px solid var(--warning)',
          }}
        >
          <p style={{ fontSize: '0.83rem', lineHeight: 1.6 }}>
            No users yet. If adding one fails saying the schema has no members table, provision it
            once, this adds a members table to <code>{schema}</code> and lets its users work on
            that client&apos;s own data. Existing tables are left untouched.
          </p>
          <form action={provisionMembers} style={{ marginTop: '0.6rem' }}>
            <input type="hidden" name="project_ref" value={projectRef} />
            <input type="hidden" name="domain" value={domain} />
            <button type="submit" className="btn btn-secondary btn-sm">
              Provision {schema}
            </button>
          </form>
        </div>
      )}

      {members && members.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <tbody>
            {members.map((m) => (
              <tr key={m.email} style={{ opacity: m.active ? 1 : 0.5 }}>
                <td style={{ padding: '0.6rem 0', borderTop: '1px solid var(--border-color)', fontSize: '0.84rem' }}>
                  {m.email}
                  {m.full_name && (
                    <span style={{ color: 'var(--text-muted)' }}> · {m.full_name}</span>
                  )}
                </td>
                <td style={{ padding: '0.6rem 0', borderTop: '1px solid var(--border-color)' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.18rem 0.5rem',
                      borderRadius: '99px',
                      background: m.role === 'owner' ? 'var(--brand-pink-glow)' : 'var(--bg-subtle)',
                      color: m.role === 'owner' ? 'var(--brand-pink-hover)' : 'var(--text-secondary)',
                    }}
                  >
                    {m.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </td>
                <td style={{ padding: '0.6rem 0', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <ResetButton email={m.email} domain={domain} />
                    <ConfirmSubmit
                      action={removeMember}
                      fields={{ project_ref: projectRef, domain, email: m.email }}
                      title="Remove this user?"
                      message={`${m.email} loses access to this client's dashboard immediately. Their sign-in account is kept, because they may also work for another client.`}
                    >
                      Remove
                    </ConfirmSubmit>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
