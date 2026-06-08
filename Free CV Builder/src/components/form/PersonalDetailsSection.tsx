import React from 'react';
import { User } from 'lucide-react';
import { CVData } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { PremiumSelect } from './PremiumSelect';
import { INPUT_CLASS, INPUT_CLASS_MIN_H, LABEL_CLASS_SM, TEXT_FIELD_LIMITS } from './constants';

interface PersonalDetailsSectionProps {
  personalInfo: CVData['personalInfo'];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (e: { target: { name: string; value: string } }) => void;
  isDarkMode?: boolean;
}

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const MARITAL_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
];

function FieldGroupTitle({
  children,
  isDarkMode,
}: {
  children: React.ReactNode;
  isDarkMode?: boolean;
}) {
  return (
    <div className="md:col-span-2 flex items-center gap-3 pt-2">
      <span className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
        {children}
      </span>
      <span className={`h-px flex-1 ${isDarkMode ? 'bg-violet-500/35' : 'bg-violet-200'}`} />
    </div>
  );
}

function DateOfBirthField({
  personalInfo,
  onChange,
}: Pick<PersonalDetailsSectionProps, 'personalInfo' | 'onChange'>) {
  return (
    <div>
      <label htmlFor="dob" className={LABEL_CLASS_SM}>Date of Birth</label>
      <div>
        <input
          id="dob"
          type="date"
          name="dob"
          value={personalInfo.dob}
          onChange={onChange}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}

export const PersonalDetailsSection = React.memo(({
  personalInfo,
  isOpen,
  onToggle,
  onChange,
  isDarkMode,
}: PersonalDetailsSectionProps) => (
  <SortableAccordionSection
    key="personalDetails"
    id="personalDetails"
    title="Personal Details"
    icon={User}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FieldGroupTitle isDarkMode={isDarkMode}>Core Info</FieldGroupTitle>
      <div>
        <label htmlFor="fullName" className={LABEL_CLASS_SM}>Full Name</label>
        <input
          id="fullName"
          type="text"
          name="fullName"
          autoComplete="name"
          placeholder="e.g. Jane Doe"
          value={personalInfo.fullName}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.personName}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="position" className={LABEL_CLASS_SM}>Professional Title</label>
        <input
          id="position"
          type="text"
          name="position"
          autoComplete="organization-title"
          placeholder="e.g. Software Engineer"
          value={personalInfo.position}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.mediumText}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="email" className={LABEL_CLASS_SM}>Email</label>
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="e.g. jane@example.com"
          value={personalInfo.email}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.email}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="phone" className={LABEL_CLASS_SM}>Phone</label>
        <input
          id="phone"
          type="text"
          name="phone"
          autoComplete="tel"
          placeholder="e.g. +1 234 567 890"
          value={personalInfo.phone}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.phone}
          className={INPUT_CLASS}
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="address" className={LABEL_CLASS_SM}>Address</label>
        <input
          id="address"
          type="text"
          name="address"
          autoComplete="street-address"
          placeholder="e.g. New York, NY"
          value={personalInfo.address}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.address}
          className={INPUT_CLASS}
        />
      </div>

      <FieldGroupTitle isDarkMode={isDarkMode}>Social Links</FieldGroupTitle>
      <div>
        <label htmlFor="linkedin" className={LABEL_CLASS_SM}>LinkedIn</label>
        <input
          id="linkedin"
          type="url"
          name="linkedin"
          autoComplete="url"
          placeholder="https://linkedin.com/in/..."
          value={personalInfo.linkedin}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.url}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="github" className={LABEL_CLASS_SM}>GitHub</label>
        <input
          id="github"
          type="url"
          name="github"
          autoComplete="url"
          placeholder="https://github.com/..."
          value={personalInfo.github}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.url}
          className={INPUT_CLASS}
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="website" className={LABEL_CLASS_SM}>Portfolio / Website</label>
        <input
          id="website"
          type="url"
          name="website"
          autoComplete="url"
          placeholder="https://example.com"
          value={personalInfo.website}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.url}
          className={INPUT_CLASS}
        />
      </div>

      <FieldGroupTitle isDarkMode={isDarkMode}>Additional Details</FieldGroupTitle>
      <div>
        <DateOfBirthField
          personalInfo={personalInfo}
          onChange={onChange}
        />
      </div>
      <div>
        <label htmlFor="nic" className={LABEL_CLASS_SM}>NIC Number</label>
        <input
          id="nic"
          type="text"
          name="nic"
          placeholder="e.g. 199012345678"
          value={personalInfo.nic}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.shortText}
          className={INPUT_CLASS}
        />
      </div>
      <PremiumSelect
        label="Gender"
        id="gender"
        name="gender"
        value={personalInfo.gender}
        onChange={onChange}
        isDarkMode={isDarkMode}
        placeholder="Select Gender"
        options={GENDER_OPTIONS}
      />
      <PremiumSelect
        label="Marital Status"
        id="maritalStatus"
        name="maritalStatus"
        value={personalInfo.maritalStatus}
        onChange={onChange}
        isDarkMode={isDarkMode}
        placeholder="Select Status"
        options={MARITAL_OPTIONS}
      />
      <div>
        <label htmlFor="nationality" className={LABEL_CLASS_SM}>Nationality</label>
        <input
          id="nationality"
          type="text"
          name="nationality"
          autoComplete="country-name"
          placeholder="e.g. American"
          value={personalInfo.nationality}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.shortText}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="religion" className={LABEL_CLASS_SM}>Religion</label>
        <input
          id="religion"
          type="text"
          name="religion"
          placeholder="e.g. Christianity"
          value={personalInfo.religion}
          onChange={onChange}
          maxLength={TEXT_FIELD_LIMITS.shortText}
          className={INPUT_CLASS_MIN_H}
        />
      </div>
    </div>
  </SortableAccordionSection>
));
