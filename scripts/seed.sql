-- 샘플 모의고사 시드 데이터 (idempotent: id 1~4 시험을 매번 새로 채움)
-- 실행: pnpm db:seed (로컬) / pnpm db:seed:prod (원격 D1)

-- 1) 기존 시드 레코드 정리 (child -> parent 순, FK 강제 여부와 무관하게 안전)
DELETE FROM `mock_exam_attempt_answer` WHERE `questionId` BETWEEN 1 AND 10;
DELETE FROM `mock_exam_attempt` WHERE `examId` BETWEEN 1 AND 4;
DELETE FROM `mock_exam_choice` WHERE `questionId` BETWEEN 1 AND 10;
DELETE FROM `mock_exam_question` WHERE `examId` BETWEEN 1 AND 4;
DELETE FROM `mock_exam_exam` WHERE `id` BETWEEN 1 AND 4;

-- 2) 시험 (parent)
INSERT INTO `mock_exam_exam` (`id`, `slug`, `title`, `description`, `level`, `subject`, `durationMinutes`, `published`) VALUES
	(1, 'middle-english-1', '중학교 영어 기초 모의고사', '기본 문법과 어휘를 점검하는 3문항 모의고사', 'middle', '영어', 20, 1),
	(2, 'high-korean-1', '고등학교 국어 모의고사', '표준어·어법 중심 3문항 모의고사', 'high', '국어', 30, 1),
	(3, 'university-aptitude-1', '대학 적성 모의고사', '수열·연산 추론 2문항', 'university', '일반', 25, 1),
	(4, 'graduate-entrance-1', '대학원 입시 논리 모의고사', '논리 추론 2문항', 'graduate', '논리', 40, 1);

-- 3) 문항
INSERT INTO `mock_exam_question` (`id`, `examId`, `order`, `type`, `prompt`, `answerKey`, `points`) VALUES
	(1, 1, 1, 'single', '다음 빈칸에 알맞은 것은? She ___ to school every day.', NULL, 10),
	(2, 1, 2, 'single', '"사과"를 영어로 쓰면?', NULL, 10),
	(3, 1, 3, 'short', '다음 우리말을 영어 한 단어로 쓰시오: 책', 'book', 10),
	(4, 2, 1, 'single', '다음 중 표준어가 아닌 것은?', NULL, 10),
	(5, 2, 2, 'single', '''역전앞''은 어떤 오류에 해당하는가?', NULL, 10),
	(6, 2, 3, 'short', '다음 속담의 빈칸을 채우시오: 티끌 모아 ___', '태산', 10),
	(7, 3, 1, 'single', '2, 4, 8, 16, ... 다음에 올 수는?', NULL, 10),
	(8, 3, 2, 'short', '12 × 12 = ?', '144', 10),
	(9, 4, 1, 'single', '모든 A는 B이고, 모든 B는 C이다. 따라서?', NULL, 10),
	(10, 4, 2, 'short', '약어 "i.e."의 라틴어 원형 두 단어를 소문자·공백 구분으로 쓰시오.', 'id est', 10);

-- 4) 선택지 (객관식 문항만)
INSERT INTO `mock_exam_choice` (`id`, `questionId`, `order`, `content`, `isCorrect`) VALUES
	(1, 1, 1, 'go', 0),
	(2, 1, 2, 'goes', 1),
	(3, 1, 3, 'going', 0),
	(4, 1, 4, 'gone', 0),
	(5, 2, 1, 'apple', 1),
	(6, 2, 2, 'orange', 0),
	(7, 2, 3, 'banana', 0),
	(8, 2, 4, 'grape', 0),
	(9, 4, 1, '강낭콩', 0),
	(10, 4, 2, '강남콩', 1),
	(11, 4, 3, '깍두기', 0),
	(12, 4, 4, '설거지', 0),
	(13, 5, 1, '의미 중복', 1),
	(14, 5, 2, '높임 오류', 0),
	(15, 5, 3, '띄어쓰기 오류', 0),
	(16, 5, 4, '맞춤법 오류', 0),
	(17, 7, 1, '24', 0),
	(18, 7, 2, '32', 1),
	(19, 7, 3, '20', 0),
	(20, 7, 4, '64', 0),
	(21, 9, 1, '모든 A는 C이다', 1),
	(22, 9, 2, '모든 C는 A이다', 0),
	(23, 9, 3, '일부 A는 C가 아니다', 0),
	(24, 9, 4, '알 수 없다', 0);
