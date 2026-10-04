"use client";

import { Modal, Spinner } from "@heroui/react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  url: string;
}

export function QrModal({ isOpen, onOpenChange, name, url }: Props) {
  const [image, setImage] = useState<{ url: string; dataUrl: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 512, margin: 1, errorCorrectionLevel: "M" }).then((dataUrl) => {
      if (!cancelled) setImage({ url, dataUrl });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, url]);

  const ready = image?.url === url;

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="truncate pe-8">{name}</Modal.Heading>
            <p className="mt-1 text-sm text-muted">用手机上的 Clash 客户端扫码导入</p>
          </Modal.Header>
          <Modal.Body className="flex flex-col items-center gap-3 pb-2">
            <div className="flex size-64 items-center justify-center rounded-2xl bg-white p-3">
              {ready ? (
                <img alt="订阅链接二维码" className="size-full" src={image.dataUrl} />
              ) : (
                <Spinner />
              )}
            </div>
            <p className="w-full break-all text-center font-mono text-xs text-muted">{url}</p>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
