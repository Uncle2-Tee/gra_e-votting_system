export function getElectionDisplayTitle(title: string) {
  return title.startsWith("GRA Election - Candidate Applications ")
    ? "Election"
    : title;
}
