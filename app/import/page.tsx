import { ImportWizard } from "@/components/import-wizard";
import { PageHeader } from "@/components/ui";

export default function ImportPage() {
  return (
    <div>
      <PageHeader title="Import" subtitle="CSV · JSON · par lots avec reprise" />
      <ImportWizard />
    </div>
  );
}
