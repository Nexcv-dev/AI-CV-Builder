import React from 'react';
import DatePicker from 'react-datepicker';
import { offset } from '@floating-ui/dom';
import { User, Calendar } from 'lucide-react';
import { CVData } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { PremiumSelect } from './PremiumSelect';
import { INPUT_CLASS, INPUT_CLASS_MIN_H, LABEL_CLASS_SM } from './constants';

interface PersonalDetailsSectionProps {
  personalInfo: CVData['personalInfo'];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (e: { target: { name: string; value: string } }) => void;
  isDarkMode?: boolean;
  isDatePickerOpen: boolean;
  onDatePickerOpen: () => void;
  onDatePickerClose: () => void;
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

export const PersonalDetailsSection = React.memo(({
  personalInfo,
  isOpen,
  onToggle,
  onChange,
  isDarkMode,
  isDatePickerOpen,
  onDatePickerOpen,
  onDatePickerClose,
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
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="address" className={LABEL_CLASS_SM}>Address</label>
        <input
          id="address"
          type="text"
          name="address"
          autoComplete="street-address"
          placeholder="e.g. New York, NY"
          value={personalInfo.address}
          onChange={onChange}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="dob" className={LABEL_CLASS_SM}>Date of Birth <span className="text-gray-400 font-normal">(Optional)</span></label>
        <div className="relative date-picker-wrapper">
          <DatePicker
            id="dob"
            name="dob"
            selected={personalInfo.dob ? new Date(personalInfo.dob) : null}
            onChange={(date) => {
              const newValue = date ? date.toISOString().split('T')[0] : '';
              const isSameDate = personalInfo.dob === newValue;
              onChange({
                target: {
                  name: 'dob',
                  value: isSameDate ? '' : newValue
                }
              } as any);
              onDatePickerClose();
            }}
            dateFormat="yyyy-MM-dd"
            placeholderText="Select Date of Birth"
            className={INPUT_CLASS}
            popperClassName={`premium-datepicker-popper ${isDarkMode ? 'dark-cv' : ''}`}
            calendarClassName="premium-datepicker-calendar"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            open={isDatePickerOpen}
            onInputClick={onDatePickerOpen}
            onClickOutside={onDatePickerClose}
            popperPlacement="top"
            popperProps={{ middleware: [offset(10)] } as any}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <Calendar size={18} />
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="nic" className={LABEL_CLASS_SM}>NIC Number <span className="text-gray-400 font-normal">(Optional)</span></label>
        <input
          id="nic"
          type="text"
          name="nic"
          placeholder="e.g. 199012345678"
          value={personalInfo.nic}
          onChange={onChange}
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
        optional={true}
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
        optional={true}
        placeholder="Select Status"
        options={MARITAL_OPTIONS}
      />
      <div>
        <label htmlFor="nationality" className={LABEL_CLASS_SM}>Nationality <span className="text-gray-400 font-normal">(Optional)</span></label>
        <input
          id="nationality"
          type="text"
          name="nationality"
          autoComplete="country-name"
          placeholder="e.g. American"
          value={personalInfo.nationality}
          onChange={onChange}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="religion" className={LABEL_CLASS_SM}>Religion <span className="text-gray-400 font-normal">(Optional)</span></label>
        <input
          id="religion"
          type="text"
          name="religion"
          placeholder="e.g. Christianity"
          value={personalInfo.religion}
          onChange={onChange}
          className={INPUT_CLASS_MIN_H}
        />
      </div>
    </div>
  </SortableAccordionSection>
));
