import { redirect } from "next/navigation";

export default function SpecDetailPage({ params }: { params: { id: string } }) {
  redirect(`/specs/${params.id}/builder`);
}
