"use client";

import * as React from "react";
import {
  ArrowUp,
  DotsThree,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { CountBadge } from "@/components/ui/count-badge";
import { FeatureChip } from "@/components/ui/feature-chip";
import { features, type Feature } from "@/components/ui/features";
import { DateInput, Field, Input, Textarea } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Notice } from "@/components/ui/notice";
import {
  Breadcrumb,
  HowItWorks,
  Page,
  PageHeader,
  PageLead,
  PageTitle,
  RelatedLinks,
  Statement,
} from "@/components/ui/page";
import { ProgressTrack } from "@/components/ui/progress";
import { Radio, RadioGroup } from "@/components/ui/radio";
import { ActionRow, DetailRow, NavRow, RowList } from "@/components/ui/row";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Bone } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { SummaryBar } from "@/components/ui/summary-bar";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  Tray,
  TrayActions,
  TrayBody,
  TrayContent,
  TrayDone,
  TrayHeader,
  TraySteps,
  TrayTrigger,
} from "@/components/ui/tray";

const featureKeys = Object.keys(features) as Feature[];

export function DesignSink() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [pending, setPending] = React.useState(false);
  const [range, setRange] = React.useState("8");
  const [count, setCount] = React.useState(3);
  const [stepperValue, setStepperValue] = React.useState(2);
  const [step, setStep] = React.useState(0);
  const [switchOn, setSwitchOn] = React.useState(true);

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-page px-5 py-10 max-sm:px-4">
      <Page>
        <PageHeader>
          <Breadcrumb items={[{ href: "/dashboard", label: "Today" }]} />
          <PageTitle>Design kit</PageTitle>
          <PageLead>Every primitive in every state, for review in light and dark.</PageLead>
        </PageHeader>

        <Section
          title="Theme"
          action={
            mounted ? (
              <Segmented
                label="Theme"
                size="sm"
                value={theme ?? "system"}
                onValueChange={setTheme}
                options={[
                  { value: "light", label: "Light" },
                  { value: "system", label: "System" },
                  { value: "dark", label: "Dark" },
                ]}
                className="w-auto min-w-60"
              />
            ) : null
          }
        >
          <Statement>The interface is a sheet of warm-white paper. Everything sits flat on it except what you can press.</Statement>
        </Section>

        <Section title="Type roles">
          <div className="grid gap-3">
            <p className="type-display">Display headline</p>
            <p className="type-title">Title for a page</p>
            <p className="type-heading">Heading for a section</p>
            <p className="type-subhead">Subhead for a card</p>
            <p className="type-statement">A statement in one big sentence.</p>
            <p className="type-body">Body text at 15px. Row titles use 500. Numbers 0123456789 are tabular.</p>
            <p className="type-label text-fg-2">Label for a field</p>
            <p className="type-caption text-fg-2">Caption under a title</p>
            <p className="type-small text-fg-2">Small hint or timestamp</p>
            <p className="type-section">Section label</p>
            <p className="type-micro">Micro 99+</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Save copy</Button>
            <Button variant="secondary">Try a sample</Button>
            <Button variant="text">Keep editing</Button>
            <Button variant="ghost">Reset</Button>
            <Button variant="destructive">Delete file</Button>
            <Button variant="plain-destructive">Discard</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm">
              Small
            </Button>
            <Button variant="secondary" size="xs">
              Extra small
            </Button>
            <Button
              variant="primary"
              pending={pending}
              pendingLabel="Saving"
              onClick={() => {
                setPending(true);
                setTimeout(() => setPending(false), 2500);
              }}
            >
              Save changes
            </Button>
            <Button
              variant="secondary"
              pending={pending}
              pendingLabel="Checking"
              onClick={() => {
                setPending(true);
                setTimeout(() => setPending(false), 2500);
              }}
            >
              Check for updates
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Search" icon={MagnifyingGlass} shortcut={["⌘", "K"]} />
            <IconButton label="Edit" icon={PencilSimple} />
            <IconButton label="Remove" icon={X} />
            <IconButton label="Add" icon={Plus} variant="secondary" />
            <IconButton label="Move up" icon={ArrowUp} size="sm" />
            <Kbd keys={["⌘", "Enter"]} />
          </div>
        </Section>

        <Section title="Fields">
          <div className="grid gap-5">
            <Field label="Quest" hint="Keep it to one sentence.">
              <Input placeholder="Write 500 words" />
            </Field>
            <Field label="Email" error="Enter a valid email address.">
              <Input type="email" defaultValue="not-an-email" />
            </Field>
            <Field label="Entry" hint="0 of 2000">
              <Textarea autoGrow placeholder="What happened today?" />
            </Field>
            <Field label="Date">
              <DateInput defaultValue="2026-10-26" />
            </Field>
            <Select
              label="Outcome"
              name="outcome"
              defaultValue="win"
              options={[
                { value: "win", label: "Win" },
                { value: "pass", label: "Pass" },
              ]}
            />
            <Select
              label="Quest"
              placeholder="All quests"
              options={[
                { value: "a", label: "Write 500 words" },
                { value: "b", label: "Morning walk" },
                { value: "c", label: "Read 10 pages", disabled: true },
              ]}
            />
          </div>
        </Section>

        <Section title="Choices">
          <div className="grid gap-5">
            <Segmented
              label="Range"
              value={range}
              onValueChange={setRange}
              options={[
                { value: "4", label: "4 weeks" },
                { value: "8", label: "8 weeks" },
                { value: "12", label: "12 weeks" },
              ]}
            />
            <ChoiceCards
              label="Wording"
              options={[
                { value: "a", title: "Write 500 words", caption: "Short and direct." },
                { value: "b", title: "Draft one page", caption: "Framed as output." },
                { value: "c", title: "Write before noon", caption: "Framed as timing." },
              ]}
            />
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-3 type-body">
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} /> Weekly digest
              </label>
              <CheckboxField label="Include archived" caption="Shows quests you set aside." />
              <Stepper label="Quests" value={stepperValue} min={1} max={12} onChange={setStepperValue} />
            </div>
            <RadioGroup defaultValue="light" aria-label="Density" className="grid gap-3">
              <Radio value="light" label="Light" caption="Warm white paper." />
              <Radio value="dark" label="Dark" caption="Black with warm greys." />
            </RadioGroup>
          </div>
        </Section>

        <Section title="Rows" count={count} action={<Button variant="text" size="sm" onClick={() => setCount((c) => c + 1)}>Add one</Button>}>
          <RowList>
            <ActionRow
              leading={<FeatureChip feature="quests" />}
              title="Write 500 words"
              caption="12 proof"
              actions={
                <>
                  <IconButton label="Move up" icon={ArrowUp} size="sm" />
                  <Menu trigger={<IconButton label="More actions" icon={DotsThree} size="sm" />}>
                    <MenuItem icon={PencilSimple}>Rename</MenuItem>
                    <MenuItem icon={Trash} destructive>
                      Delete
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem shortcut={["⌘", "K"]}>Open search</MenuItem>
                  </Menu>
                </>
              }
            />
            <DetailRow label="Theme" caption="Follows your device by default." control={<Switch defaultChecked />} />
            <DetailRow label="Time zone" control={<span className="type-body text-fg-2">Europe/London</span>} />
            <NavRow href="/dashboard/stats" feature="stats" title="Stats" caption="Win rate by week." />
            <NavRow href="/dashboard/identity" feature="identity" title="Identity" caption="Evidence of who you are becoming." current />
          </RowList>
          <SummaryBar caption="3 of 4 done">
            <Button variant="primary">Add quest</Button>
          </SummaryBar>
        </Section>

        <Section title="Feature chips">
          <div className="flex flex-wrap gap-3">
            {featureKeys.map((key) => (
              <span key={key} className="flex items-center gap-2 type-caption text-fg-2">
                <FeatureChip feature={key} />
                {features[key].label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <FeatureChip feature="proof" size="sm" />
            <FeatureChip feature="proof" />
            <FeatureChip feature="proof" size="lg" />
            <span className="type-body">Count <CountBadge value={count} /></span>
            <span className="type-body">Many <CountBadge value={120} /></span>
          </div>
        </Section>

        <Section title="Notices">
          <div className="grid gap-3">
            <Notice>Your original is not changed, and nothing is uploaded.</Notice>
            <Notice tone="ok">Saved. Your proof is in the archive.</Notice>
            <Notice tone="warn" action={{ label: "View quests", href: "/dashboard/quests" }}>
              2 quests are at risk. Check in today to keep them going.
            </Notice>
            <Notice tone="bad" action={{ label: "Try again", onClick: () => undefined }}>
              Proof could not be saved. Check your connection and try again.
            </Notice>
          </div>
        </Section>

        <Section title="Progress and bones">
          <ProgressTrack value={62} label="Win rate" />
          <div className="grid gap-3">
            <Bone className="h-7 w-48" />
            <Bone className="h-5 w-80" />
            <Bone className="h-11 w-full" />
          </div>
        </Section>

        <Section title="Trays and toasts">
          <div className="flex flex-wrap gap-3">
            <Tray>
              <TrayTrigger asChild>
                <Button variant="secondary">Edit proof</Button>
              </TrayTrigger>
              <TrayContent>
                <TrayHeader title="Edit proof" description="Change the outcome or note." />
                <TrayBody>
                  <Select
                    label="Outcome"
                    defaultValue="win"
                    options={[
                      { value: "win", label: "Win" },
                      { value: "pass", label: "Pass" },
                    ]}
                  />
                  <Field label="Note">
                    <Textarea autoGrow defaultValue="Wrote the opening scene." />
                  </Field>
                  <p className="type-body text-fg-2">Your original check-in date stays the same.</p>
                </TrayBody>
                <TrayActions
                  primary={
                    <Button variant="primary" fullWidth>
                      Save proof
                    </Button>
                  }
                  secondary={
                    <Button variant="text" fullWidth>
                      Cancel
                    </Button>
                  }
                />
              </TrayContent>
            </Tray>

            <Tray onOpenChange={(o) => !o && setStep(0)}>
              <TrayTrigger asChild>
                <Button variant="secondary">Multi-step</Button>
              </TrayTrigger>
              <TrayContent width="wide">
                <TrayHeader title={step === 2 ? "Done" : "Reword quest"} />
                <TraySteps step={step}>
                  <TrayBody>
                    <p className="type-body text-fg-2">Pick a wording. The original stays until you confirm.</p>
                    <ChoiceCards
                      label="Wording"
                      columns={1}
                      options={[
                        { value: "a", title: "Write 500 words", caption: "Short and direct." },
                        { value: "b", title: "Draft one page", caption: "Framed as output." },
                      ]}
                    />
                    <TrayActions primary={<Button variant="primary" fullWidth onClick={() => setStep(1)}>Continue</Button>} />
                  </TrayBody>
                  <TrayBody>
                    <Notice>This renames the quest everywhere it appears.</Notice>
                    <TrayActions
                      primary={<Button variant="primary" fullWidth onClick={() => setStep(2)}>Use this wording</Button>}
                      secondary={<Button variant="text" fullWidth onClick={() => setStep(0)}>Back</Button>}
                    />
                  </TrayBody>
                  <TrayBody>
                    <TrayDone
                      thumbnail={<FeatureChip feature="quests" size="lg" />}
                      heading="Renamed"
                      meta="Draft one page"
                    />
                    <TrayActions secondary={<Button variant="text" fullWidth onClick={() => setStep(0)}>Start over</Button>} />
                  </TrayBody>
                </TraySteps>
              </TrayContent>
            </Tray>

            <ConfirmTray
              trigger={<Button variant="plain-destructive">Delete entry</Button>}
              title="Delete this entry?"
              body="This can't be undone."
              confirmLabel="Delete entry"
              onConfirm={() => toast.show("Entry deleted")}
            />

            <Button variant="secondary" onClick={() => toast.show("Proof saved")}>
              Show toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.show("Quest archived", {
                  action: { label: "Undo", onClick: () => toast.show("Quest restored") },
                })
              }
            >
              Undo toast
            </Button>
          </div>
        </Section>

        <HowItWorks
          steps={[
            { title: "Choose your character", body: "One sentence about who you are becoming." },
            { title: "Check in with wins", body: "Each day, mark each quest as a win or a pass." },
            { title: "Watch your proof grow", body: "Weeks of check-ins become evidence." },
          ]}
        />

        <RelatedLinks>
          <NavRow href="/dashboard/stats" feature="stats" title="Stats" />
          <NavRow href="/dashboard/story" feature="story" title="Story" />
        </RelatedLinks>
      </Page>
    </main>
  );
}
