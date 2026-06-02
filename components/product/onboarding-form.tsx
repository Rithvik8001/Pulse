"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
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
import { createInitialPulseState, writePulseState } from "@/lib/pulse/storage";

export function OnboardingForm() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [habits, setHabits] = useState(["", "", ""]);
  const [submitted, setSubmitted] = useState(false);

  const cleanHabits = useMemo(
    () => habits.map((habit) => habit.trim()).filter(Boolean),
    [habits],
  );
  const canSubmit = identity.trim().length > 0 && cleanHabits.length > 0;

  function updateHabit(index: number, value: string) {
    setHabits((current) =>
      current.map((habit, habitIndex) =>
        habitIndex === index ? value : habit,
      ),
    );
  }

  function addHabit() {
    setHabits((current) => (current.length >= 3 ? current : [...current, ""]));
  }

  function removeHabit(index: number) {
    setHabits((current) => {
      const next = current.filter((_, habitIndex) => habitIndex !== index);
      return next.length === 0 ? [""] : next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (!canSubmit) {
      return;
    }

    writePulseState(createInitialPulseState(identity, cleanHabits));
    router.push("/app/today");
  }

  return (
    <main className="min-h-svh bg-background px-4 py-6 text-foreground md:px-6 lg:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <Mascot width={30} height={30} />
            Pulse
          </Link>
          <Badge variant="outline">Local MVP</Badge>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              <HugeiconsIcon icon={Target01Icon} size={14} strokeWidth={1.7} />
              Identity setup
            </div>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
              Name who you are becoming.
            </h1>
            <p className="mt-4 max-w-lg text-sm/relaxed text-muted-foreground">
              Start with one identity and a few habits that vote for it. This
              browser-local setup can be replaced by auth and database storage
              later without changing the product flow.
            </p>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Build your first identity</CardTitle>
              <CardDescription>
                Keep it specific and light enough to check in every day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-medium" htmlFor="identity">
                    I am a
                  </label>
                  <Input
                    id="identity"
                    value={identity}
                    placeholder="writer"
                    onChange={(event) => setIdentity(event.target.value)}
                    aria-invalid={submitted && identity.trim().length === 0}
                    className="h-9 text-sm"
                  />
                  {submitted && identity.trim().length === 0 ? (
                    <p className="text-xs text-destructive">
                      Add an identity before continuing.
                    </p>
                  ) : null}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium">
                        Habits that vote for it
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Add 1-3 small actions.
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addHabit}
                      disabled={habits.length >= 3}
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
                    {habits.map((habit, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={habit}
                          placeholder={
                            index === 0
                              ? "Write 500 words"
                              : index === 1
                                ? "Morning walk"
                                : "Read 10 pages"
                          }
                          onChange={(event) =>
                            updateHabit(index, event.target.value)
                          }
                          className="h-9 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          aria-label="Remove habit"
                          onClick={() => removeHabit(index)}
                          disabled={habits.length === 1}
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

                  {submitted && cleanHabits.length === 0 ? (
                    <p className="text-xs text-destructive">
                      Add at least one habit before continuing.
                    </p>
                  ) : null}
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Start today
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    strokeWidth={1.7}
                  />
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-3 md:grid-cols-3">
          {["One identity", "Daily done/skip", "Proof over streaks"].map(
            (item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={15}
                  strokeWidth={1.7}
                  className="text-foreground"
                />
                {item}
              </div>
            ),
          )}
        </div>
      </div>
    </main>
  );
}
