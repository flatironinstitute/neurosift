import {
  AppBar,
  Breadcrumbs,
  ObjectPath,
  ToastProvider,
  useToast,
  type AppBarAction,
  type Crumb,
} from "@ui";

/** Breadcrumbs that can expand their folded middle; the docs need them hydrated for that. */
export function BreadcrumbsDemo({ items }: { items: Crumb[] }) {
  return <Breadcrumbs items={items} />;
}

function Path() {
  const toast = useToast();
  const copy = (text: string, message: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.show({ status: "success", message }),
      () =>
        toast.show({
          status: "error",
          message: "Couldn’t copy. Copy it from the address bar.",
        }),
    );
  return (
    <ObjectPath
      type="ElectricalSeries"
      path="/acquisition/LFPs"
      onCopyPath={() => copy("/acquisition/LFPs", "Path copied")}
      onCopyLink={() => copy(window.location.href, "Link copied")}
    />
  );
}

/** The object path with its copy buttons wired to toasts, as the app does. */
export function ObjectPathDemo() {
  return (
    <ToastProvider>
      <Path />
    </ToastProvider>
  );
}

/** The app bar with the docs' copy of the logo; Astro can't pass markup as a React prop. */
export function AppBarDemo({
  logoSrc,
  homeHref,
  actions,
}: {
  logoSrc: string;
  homeHref: string;
  actions: AppBarAction[];
}) {
  return (
    <AppBar
      homeHref={homeHref}
      logo={<img src={logoSrc} alt="" width={28} height={28} />}
      actions={actions}
    />
  );
}
