import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableAccordionSectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  showDragHandle?: boolean;
}

export const SortableAccordionSection = React.memo(({
  id,
  title,
  icon: Icon,
  children,
  isOpen,
  onToggle,
  showDragHandle = false,
}: SortableAccordionSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-xl mb-4 bg-white transition-colors duration-300 ${isOpen ? 'border-violet-500 shadow-md' : 'border-gray-200 shadow-sm'} ${isDragging ? 'opacity-50 shadow-lg relative' : ''}`}
    >
      <div className={`w-full flex items-center transition-colors rounded-t-xl overflow-hidden ${isOpen ? 'bg-violet-50/30' : 'bg-gray-50 hover:bg-gray-100'}`}>
        {showDragHandle && (
          <div
            className="flex items-center px-2 py-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-4 cursor-pointer"
        >
          <div className="flex items-center font-semibold text-gray-800">
            <Icon size={18} className="mr-2 text-violet-600" />
            {title}
          </div>
          {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-visible"
          >
            <div className="p-5 border-t border-gray-200">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
