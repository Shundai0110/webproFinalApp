type RankingBook = {
  title: string;
  usedLesson: string;
  usedFaculty: string | null;
  usedDepartment: string | null;
  targetYear: number | null;
  materialType: string;
  usedYear: number;
};

type RankingUser = {
  faculty: string;
  department: string;
  year: number;
};

export function calculateRelatedScore(
  book: RankingBook,
  user: RankingUser,
  query: string | undefined,
) {
  const term = query?.trim().toLowerCase() ?? "";
  let score = 0;
  if (term && book.title.toLowerCase().includes(term)) score += 40;
  if (term && book.usedLesson.toLowerCase().includes(term)) score += 30;
  if (book.usedFaculty === user.faculty) score += 15;
  if (book.usedDepartment === user.department) score += 15;
  if (book.targetYear === user.year) score += 10;
  if (book.usedYear >= new Date().getFullYear() - 1) score += 10;
  if (book.materialType === "REQUIRED") score += 5;
  return score;
}
