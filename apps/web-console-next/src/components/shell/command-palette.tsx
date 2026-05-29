"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  CommandRoot,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSession } from "@/lib/session";
import { useToast } from "@/components/ui/toast";
import {
  Building2,
  FolderKanban,
  Boxes,
  KeyRound,
  Settings,
  ScrollText,
  Receipt,
  UserPlus,
  PlusCircle,
  LogOut,
  Users,
  Mail,
} from "lucide-react";

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const params = useParams<{ orgSlug?: string; projectSlug?: string }>();
  const { setToken, target, availableTargets, setTarget, isLocked } = useSession();
  const { toast } = useToast();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const orgSlug = params?.orgSlug;
  const projectSlug = params?.projectSlug;
  const orgBase = orgSlug ? `/orgs/${orgSlug}` : null;
  const projectBase = orgSlug && projectSlug ? `/orgs/${orgSlug}/projects/${projectSlug}` : null;

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <PaletteCtx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-xl">
          <CommandRoot>
            <CommandInput placeholder="Search actions, pages, scopes…" />
            <CommandList>
              <CommandEmpty>No matching commands.</CommandEmpty>

              <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => go("/orgs")}>
                  <Building2 className="h-4 w-4 opacity-70" />
                  Switch organization
                  <CommandShortcut>O</CommandShortcut>
                </CommandItem>
                {orgBase && (
                  <CommandItem onSelect={() => go(`${orgBase}/projects`)}>
                    <FolderKanban className="h-4 w-4 opacity-70" />
                    Projects
                  </CommandItem>
                )}
                {projectBase && (
                  <CommandItem onSelect={() => go(`${projectBase}/environments`)}>
                    <Boxes className="h-4 w-4 opacity-70" />
                    Environments
                  </CommandItem>
                )}
                {orgBase && (
                  <>
                    <CommandItem onSelect={() => go(`${orgBase}/members`)}>
                      <Users className="h-4 w-4 opacity-70" />
                      Members
                    </CommandItem>
                    <CommandItem onSelect={() => go(`${orgBase}/invitations`)}>
                      <Mail className="h-4 w-4 opacity-70" />
                      Invitations
                    </CommandItem>
                    <CommandItem onSelect={() => go(`${orgBase}/api-keys`)}>
                      <KeyRound className="h-4 w-4 opacity-70" />
                      API keys
                    </CommandItem>
                    <CommandItem onSelect={() => go(`${orgBase}/config`)}>
                      <Settings className="h-4 w-4 opacity-70" />
                      Config
                    </CommandItem>
                    <CommandItem onSelect={() => go(`${orgBase}/audit`)}>
                      <ScrollText className="h-4 w-4 opacity-70" />
                      Audit log
                    </CommandItem>
                    <CommandItem onSelect={() => go(`${orgBase}/billing`)}>
                      <Receipt className="h-4 w-4 opacity-70" />
                      Billing
                    </CommandItem>
                  </>
                )}
              </CommandGroup>

              <CommandGroup heading="Create">
                <CommandItem onSelect={() => go("/orgs?new=1")}>
                  <PlusCircle className="h-4 w-4 opacity-70" />
                  Create organization
                </CommandItem>
                {orgBase && (
                  <>
                    <CommandItem onSelect={() => go(`${orgBase}/projects?new=1`)}>
                      <PlusCircle className="h-4 w-4 opacity-70" />
                      Create project
                    </CommandItem>
                    <CommandItem onSelect={() => go(`${orgBase}/invitations?new=1`)}>
                      <UserPlus className="h-4 w-4 opacity-70" />
                      Create invitation
                    </CommandItem>
                    <CommandItem onSelect={() => go(`${orgBase}/api-keys?new=1`)}>
                      <KeyRound className="h-4 w-4 opacity-70" />
                      Create API key
                    </CommandItem>
                  </>
                )}
                {projectBase && (
                  <CommandItem onSelect={() => go(`${projectBase}/environments?new=1`)}>
                    <PlusCircle className="h-4 w-4 opacity-70" />
                    Create environment
                  </CommandItem>
                )}
              </CommandGroup>

              {!isLocked && (
                <CommandGroup heading={`Target (current: ${target.name})`}>
                  {availableTargets.map((t) => (
                    <CommandItem
                      key={t.name}
                      onSelect={() => {
                        setTarget(t);
                        setOpen(false);
                        toast({ kind: "success", title: `Switched to ${t.name}` });
                      }}
                    >
                      {t.name}
                      <span className="ml-auto text-xs text-muted-foreground">{t.url.replace(/^https?:\/\//, "")}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandGroup heading="Session">
                <CommandItem
                  onSelect={() => {
                    setToken(null);
                    setOpen(false);
                    router.push("/login");
                    toast({ kind: "success", title: "Logged out" });
                  }}
                >
                  <LogOut className="h-4 w-4 opacity-70" />
                  Logout
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandRoot>
        </DialogContent>
      </Dialog>
    </PaletteCtx.Provider>
  );
}

interface PaletteCtxValue {
  open: () => void;
}
const PaletteCtx = React.createContext<PaletteCtxValue>({ open: () => {} });
export function usePalette() {
  return React.useContext(PaletteCtx);
}
// Avoid unused-import lints in some configs.
export const _pathnameRef = (): string | null => (typeof window !== "undefined" ? window.location.pathname : null);
void useParams;
