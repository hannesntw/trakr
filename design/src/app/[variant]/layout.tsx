import { Suspense } from "react";
import { variantIds } from "../variants";
import { VariantProvider } from "@/components/VariantContext";
import { StateOverrideProvider } from "@/components/StateOverrideContext";
import { DesignToolbar } from "@/components/DesignToolbar";
import { SidebarNav } from "@/components/SidebarNav";

export function generateStaticParams() {
  return variantIds.map((variant) => ({ variant }));
}

export default async function VariantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;

  return (
    <VariantProvider variantId={variant}>
      <Suspense>
        <StateOverrideProvider>
          <DesignToolbar />
          <div className="pt-9 h-full flex">
            <SidebarNav variant={variant} />
            <main className="flex-1 flex flex-col min-w-0 bg-content-bg">
              {children}
            </main>
          </div>
        </StateOverrideProvider>
      </Suspense>
    </VariantProvider>
  );
}
