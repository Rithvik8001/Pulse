"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Calendar03Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  EnergyIcon,
  PlusSignIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import { Mascot } from "@/components/landing/mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function OnboardingForm() {
  const [character, setCharacter] = useState("");
  const [quests, setQuests] = useState(["", "", ""]);
  const [submitted, setSubmitted] = useState(false);
  const [demoReady, setDemoReady] = useState(false);

  const cleanQuests = useMemo(
    () => quests.map((quest) => quest.trim()).filter(Boolean),
    [quests],
  );
  const canSubmit = character.trim().length > 0 && cleanQuests.length > 0;

  function updateQuest(index: number, value: string) {
    setQuests((current) =>
      current.map((quest, questIndex) =>
        questIndex === index ? value : quest,
      ),
    );
    setDemoReady(false);
  }

  function addQuest() {
    setQuests((current) => (current.length >= 3 ? current : [...current, ""]));
    setDemoReady(false);
  }

  function removeQuest(index: number) {
    setQuests((current) => {
      const next = current.filter((_, questIndex) => questIndex !== index);
      return next.length === 0 ? [""] : next;
    });
    setDemoReady(false);
  }

  function resetDemo() {
    setCharacter("");
    setQuests(["", "", ""]);
    setSubmitted(false);
    setDemoReady(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (!canSubmit) {
      return;
    }

    setDemoReady(true);
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-5 md:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Pulse home"
            className="flex size-9 items-center justify-center rounded-md"
          >
            <Mascot width={30} height={30} />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-8 md:py-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="space-y-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                <HugeiconsIcon
                  icon={Target01Icon}
                  size={14}
                  strokeWidth={1.7}
                />
                Interactive demo
              </div>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
                Build a character in under a minute.
              </h1>
              <p className="mt-4 max-w-lg text-sm/relaxed text-muted-foreground">
                Try the core Pulse setup with no account, no database, and no
                saved browser state. Pick a character, choose a few quests, and
                preview how your proof starts to take shape.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ["One character", "Name who you are becoming."],
                ["Three quests max", "Keep the demo focused and small."],
                ["Nothing saved", "This page never writes localStorage."],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-lg border bg-card px-3 py-3 text-xs"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={15}
                      strokeWidth={1.7}
                      className="text-primary"
                    />
                    {title}
                  </div>
                  <p className="mt-1 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.78fr] lg:items-stretch">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Try the setup</CardTitle>
                    <CardDescription>
                      Keep it specific and light enough to check in every day.
                    </CardDescription>
                  </div>
                  {demoReady ? (
                    <Badge variant="outline" className="shrink-0">
                      Demo ready
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <label className="text-xs font-medium" htmlFor="character">
                      I am a
                    </label>
                    <Input
                      id="character"
                      value={character}
                      placeholder="writer"
                      onChange={(event) => {
                        setCharacter(event.target.value);
                        setDemoReady(false);
                      }}
                      aria-invalid={submitted && character.trim().length === 0}
                      className="h-10 text-sm"
                    />
                    {submitted && character.trim().length === 0 ? (
                      <p className="text-xs text-destructive">
                        Add a character before continuing.
                      </p>
                    ) : null}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium">
                          Quests that prove it
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Add 1-3 small actions.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addQuest}
                        disabled={quests.length >= 3}
                      >
                        <HugeiconsIcon
                          icon={PlusSignIcon}
                          size={14}
                          strokeWidth={1.7}
                        />
                        Add
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {quests.map((quest, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={quest}
                            placeholder={
                              index === 0
                                ? "Write 500 words"
                                : index === 1
                                  ? "Morning walk"
                                  : "Read 10 pages"
                            }
                            onChange={(event) =>
                              updateQuest(index, event.target.value)
                            }
                            className="h-10 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            aria-label="Remove quest"
                            onClick={() => removeQuest(index)}
                            disabled={quests.length === 1}
                          >
                            <HugeiconsIcon
                              icon={Delete02Icon}
                              size={16}
                              strokeWidth={1.7}
                            />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {submitted && cleanQuests.length === 0 ? (
                      <p className="text-xs text-destructive">
                        Add at least one quest before continuing.
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Button type="submit" size="lg" className="w-full">
                      Preview demo
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={16}
                        strokeWidth={1.7}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={resetDemo}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={EnergyIcon}
                    size={17}
                    strokeWidth={1.7}
                    className="text-primary"
                  />
                  Proof preview
                </CardTitle>
                <CardDescription>
                  A sample of what your first check-in could look like.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Character</div>
                  <div className="mt-1 truncate text-xl font-semibold tracking-tight">
                    {character.trim()
                      ? `You're a ${character.trim()}.`
                      : "You're a writer."}
                  </div>
                </div>

                <div className="space-y-2">
                  {(cleanQuests.length > 0
                    ? cleanQuests
                    : ["Write 500 words", "Morning walk", "Read 10 pages"]
                  ).map((quest, index) => (
                    <div
                      key={`${quest}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0 truncate">{quest}</span>
                      <Badge
                        variant={index === 1 ? "secondary" : "outline"}
                        className="shrink-0"
                      >
                        {index === 1 ? "Pass" : "Win"}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <HugeiconsIcon
                        icon={Calendar03Icon}
                        size={13}
                        strokeWidth={1.7}
                      />
                      Proof days
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {demoReady ? "1" : "0"}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-xs text-muted-foreground">
                      Momentum
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {demoReady ? "62" : "0"}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        /100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed p-3 text-xs/relaxed text-muted-foreground">
                  {demoReady
                    ? "Demo ready. Nothing was saved, and your browser state stayed untouched."
                    : "Submit the demo to preview a first day of proof without saving anything."}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
