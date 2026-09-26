import { ProfileEditor } from "@/components/settings/profile-editor";

export default async function TrainerProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <ProfileEditor profileId={profileId} />;
}
