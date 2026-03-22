'use client';

import { useState, useEffect } from 'react';
import { Users, FolderOpen } from 'lucide-react';
import { PeopleContent } from './PeopleContent';
import { GroupsContent } from './GroupsContent';

type Person = {
  id: string;
  name: string;
  type: string;
  birthdate: string | null;
  phone: string | null;
  email: string | null;
  streetName: string | null;
  zipCode: string | null;
  county: string | null;
  timezone: string | null;
  notes: string | null;
  userId: string | null;
  isPowerUser?: boolean;
  hasPendingInvite?: boolean;
};

export function PeoplePageTabs({
  initialPeople,
  allowEdit,
  initialTab = 'people',
  betaJoinUrl,
}: {
  initialPeople: Person[];
  allowEdit: boolean;
  initialTab?: 'people' | 'groups';
  betaJoinUrl?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<'people' | 'groups'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-lg bg-stage-card border border-stage-border w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('people')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            activeTab === 'people'
              ? 'bg-stage-accent text-stage-dark'
              : 'text-stage-muted hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" /> People
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            activeTab === 'groups'
              ? 'bg-stage-accent text-stage-dark'
              : 'text-stage-muted hover:text-white'
          }`}
        >
          <FolderOpen className="h-4 w-4" /> Groups
        </button>
      </div>

      {activeTab === 'people' && (
        <PeopleContent initialPeople={initialPeople} allowEdit={allowEdit} betaJoinUrl={betaJoinUrl} />
      )}
      {activeTab === 'groups' && <GroupsContent allowEdit={allowEdit} />}
    </div>
  );
}
