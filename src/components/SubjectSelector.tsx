import { useState } from "react";
import { Check, ChevronDown, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface Subject {
  value: string;
  label: string;
  description: string;
}

const subjects: Subject[] = [
  {
    value: "mathematics",
    label: "Math",
    description: ""
  },
  {
    value: "physics",
    label: "Physics", 
    description: ""
  },
  {
    value: "chemistry",
    label: "Chemistry",
    description: ""
  },
  {
    value: "biology",
    label: "Biology",
    description: ""
  },
  {
    value: "bangla",
    label: "Bangla",
    description: ""
  },
  {
    value: "english",
    label: "English",
    description: ""
  },
  {
    value: "ict",
    label: "ICT",
    description: ""
  },
  {
    value: "science",
    label: "Science",
    description: ""
  },
  {
    value: "higher-math",
    label: "Higher Math",
    description: ""
  }
];

interface SubjectSelectorProps {
  selectedSubject: Subject | null;
  onSubjectChange: (subject: Subject) => void;
}

export function SubjectSelector({ selectedSubject, onSubjectChange }: SubjectSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-48 justify-between bg-card border-border hover:bg-accent"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {selectedSubject ? selectedSubject.label : "Select subject..."}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border-border">
        <Command>
          <CommandInput placeholder="Search subjects..." className="h-9" />
          <CommandEmpty>No subject found.</CommandEmpty>
          <CommandGroup>
            {subjects.map((subject) => (
              <CommandItem
                key={subject.value}
                value={subject.value}
                onSelect={(currentValue) => {
                  const subject = subjects.find(s => s.value === currentValue);
                  if (subject) {
                    onSubjectChange(subject);
                  }
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedSubject?.value === subject.value
                        ? "opacity-100 text-primary"
                        : "opacity-0"
                    )}
                  />
                  <span className="font-medium">{subject.label}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}