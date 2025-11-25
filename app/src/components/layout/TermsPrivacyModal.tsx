import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface TermsPrivacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "privacy" | "terms";
}

const CONTENT = {
  privacy: {
    title: "Privacy Policy",
    description: "Your privacy is important to us. ZAUNCHPAD is a privacy-first platform that does not collect personal data unless explicitly provided by you. All information is handled with the highest standards of privacy and security using zero-knowledge proofs.",
    body: (
      <>
        <p>ZAUNCHPAD is committed to protecting your privacy through advanced cryptographic techniques. We utilize Zcash shielded pools to ensure anonymous participation. We do not collect any personal information unless you voluntarily provide it. Any data you provide is used solely for the purpose of improving your experience on our platform.</p>
        <p>For more information, please contact us at <a href="mailto:support@zaunchpad.com" className="underline">support@zaunchpad.com</a>.</p>
      </>
    )
  },
  terms: {
    title: "Terms of Use",
    description: "By using ZAUNCHPAD, you agree to our terms. Use the platform responsibly and at your own risk. See our website for more details.",
    body: (
      <>
        <p>By accessing or using ZAUNCHPAD, you agree to comply with all applicable laws and regulations. The platform is provided as-is, without warranties of any kind. Use at your own risk.</p>
        <p>For more information, please visit <a href="https://www.zaunchpad.com" target="_blank" className="underline">www.zaunchpad.com</a>.</p>
      </>
    )
  }
};

export const TermsPrivacyModal = ({ open, onOpenChange, type }: TermsPrivacyModalProps) => {
  const content = CONTENT[type];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {content.body}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 