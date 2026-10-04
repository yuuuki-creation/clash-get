"use client";

import { AlertDialog, Button, Spinner, toast } from "@heroui/react";
import { useState } from "react";
import { errorMessage } from "@/lib/client";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  status?: "danger" | "warning";
  onConfirm: () => Promise<void>;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  status = "danger",
  onConfirm,
}: Props) {
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      toast.danger(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status={status} />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p className="break-words">{description}</p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button isDisabled={pending} slot="close" variant="tertiary">
              取消
            </Button>
            <Button isPending={pending} variant={status === "danger" ? "danger" : "primary"} onPress={confirm}>
              {({ isPending }) => (
                <>
                  {isPending && <Spinner color="current" size="sm" />}
                  {confirmLabel}
                </>
              )}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
