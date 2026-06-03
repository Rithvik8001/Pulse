"use client";

import { useActionState, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  PlusSignIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";

import {
  createInitialSetup,
  type SetupFormState,
} from "@/app/dashboard/actions";
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

const emptyQuestList = ["", "", ""];

export function DashboardSetupForm() {
  const initialState: SetupFormState = {
    status: "idle",
    fields: {
      quests: emptyQuestList,
    },
  };
  const [state, action, pending] = useActionState(
    createInitialSetup,
    initialState,
  );
  const [character, setCharacter] = useState(state.fields?.character ?? "");
  const [quests, setQuests] = useState(state.fields?.quests ?? emptyQuestList);

  function addQuest() {
    setQuests((current) => (current.length >= 3 ? current : [...current, ""]));
  }

  function removeQuest(index: number) {
    setQuests((current) => {
      const next = current.filter((_, questIndex) => questIndex !== index);
      return next.length === 0 ? [""] : next;
    });
  }

  function updateQuest(index: number, value: string) {
    setQuests((current) =>
      current.map((quest, questIndex) =>
        questIndex === index ? value : quest,
      ),
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
      <Card className="rounded-lg">
        <CardHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <HugeiconsIcon icon={Target01Icon} size={18} strokeWidth={1.8} />
          </div>
          <CardTitle>Create your Character</CardTitle>
          <CardDescription>
            Save the identity and first Quests your dashboard will track.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {[
            "Pick one Character you want to build.",
            "Add one to three Quests that prove it.",
            "This version saves setup only; Check-ins come next.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <HugeiconsIcon
                className="mt-0.5 text-primary"
                icon={CheckmarkCircle01Icon}
                size={15}
                strokeWidth={1.7}
              />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>First setup</CardTitle>
              <CardDescription>
                Keep it specific enough to recognize proof each day.
              </CardDescription>
            </div>
            <Badge variant="outline">Persistent</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="character">
                I am a
              </label>
              <Input
                id="character"
                name="character"
                placeholder="writer"
                value={character}
                onChange={(event) => setCharacter(event.target.value)}
                maxLength={48}
                required
                aria-invalid={Boolean(state.errors?.character)}
                className="h-10 text-sm"
              />
              {state.errors?.character ? (
                <p className="text-xs text-destructive">
                  {state.errors.character}
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
                      name="quests"
                      placeholder={
                        index === 0
                          ? "Write 500 words"
                          : index === 1
                            ? "Morning walk"
                            : "Read 10 pages"
                      }
                      value={quest}
                      onChange={(event) =>
                        updateQuest(index, event.target.value)
                      }
                      maxLength={96}
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

              {state.errors?.quests ? (
                <p className="text-xs text-destructive">
                  {state.errors.quests}
                </p>
              ) : null}
            </div>

            {state.message ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs/relaxed text-destructive">
                {state.message}
              </div>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={pending}
            >
              {pending ? "Saving setup" : "Save setup"}
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
  );
}
