"use client";

import { useState, forwardRef } from "react";
import { PlusIcon } from "lucide-react";
import { AddMemoryModal } from "./add-memory-modal";

export const AddMemoryButton = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button {...props} type="button" onClick={() => setOpen(true)}>
        <PlusIcon />
        <span className="sr-only">Add Memory</span>
      </button>
      <AddMemoryModal open={open} onOpenChange={setOpen} />
    </>
  );
};

AddMemoryButton.displayName = "AddMemoryButton";
