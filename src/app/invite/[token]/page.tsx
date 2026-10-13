import {AcceptInvitationForm} from "@/components/invitations/AcceptInvitationForm";

export const instant = false;

export const metadata = {title: "Accept invitation | Iglesia Plenitud en Cristo"};

export default async function InviteTokenPage({params}: {params: Promise<{token: string}>}) {
  const {token} = await params;
  return (
    <main className="admin-shell" lang="en">
      <div className="admin-card">
        <AcceptInvitationForm token={token} />
      </div>
    </main>
  );
}
