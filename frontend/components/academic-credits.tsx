import { STUDENTS, WORK_TITLE } from '../lib/credits.ts';

/** Credito do trabalho A3 com os alunos e os RAs; "centered" nas telas de cartao (login, senha, 404 e erro). */
export default function AcademicCredits({ centered = false }: { centered?: boolean }) {
  return (
    <footer className={`credits${centered ? ' credits-onboard' : ''}`} aria-label="Créditos do trabalho">
      <p><strong>{WORK_TITLE}</strong> · feito pelos alunos:</p>
      <ul>{STUDENTS.map(student => <li key={student.ra}>{student.name} · RA <span className="num">{student.ra}</span></li>)}</ul>
    </footer>
  );
}
