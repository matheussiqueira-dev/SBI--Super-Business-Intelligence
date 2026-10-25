import { STUDENTS, WORK_TITLE } from '../lib/credits.ts';

/**
 * Credito do trabalho A3 com os alunos e os RAs. Nas areas internas fica dentro do rodape da pagina (por isso e um bloco, e
 * nao outro <footer>); "centered" nas telas sem menu (entrada, senha, pagina nao encontrada e falha).
 */
export default function AcademicCredits({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`credits${centered ? ' credits-onboard' : ''}`}>
      <p><strong>{WORK_TITLE}</strong> · feito pelos alunos:</p>
      <ul>{STUDENTS.map(student => <li key={student.ra}>{student.name} · RA <span className="num">{student.ra}</span></li>)}</ul>
    </div>
  );
}
