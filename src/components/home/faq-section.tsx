import { FAQSection as BaseFAQSection } from '@/components/faq-section';
import { HOME_FAQS } from '@/data/faq';

export function FAQSection() {
  return (
    <BaseFAQSection
      title="Common Questions"
      subtitle="Everything you need to know to get started."
      items={HOME_FAQS}
      showSearch={false}
    />
  );
}
