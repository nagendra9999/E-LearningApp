const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "e-learning.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(2000, () =>
      console.log("Server Running at http://localhost:2000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//authenticate middleware
const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        request.role = payload.role;
        next();
      }
    });
  }
};

//authenticate User-Role
const authenticateRole = (request, response, next) => {
  const { username, role } = request;
  if (role === "tutor") {
    next();
  } else {
    response.status(401);
    response.send("Only tutors can access");
  }
};

//register user API
app.post("/register/", async (request, response) => {
  const { user_id, name, username, password, role, course_id } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const user = await database.get(getUserQuery);
  if (user !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const postUserQuery = `
            INSERT INTO
              user (user_id,name,username,password,role,course_id) 
              VALUES (
                  '${user_id}',
                  '${name}',
                  '${username}',
                  '${hashedPassword}',
                  '${role}',
                  '${course_id}'
              );
            `;
    await database.run(postUserQuery);
    response.status(200);
    response.send("User created successfully");
  }
});

//login user API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
  SELECT
    *
  FROM
    user
  WHERE username = '${username}'
  `;
  const dbUser = await database.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);
    if (isPasswordValid === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const role = dbUser.role;
      const payload = { username: username, role: role };
      const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtToken });
    }
  }
});

//user-details
const getUser = async (username) => {
  const getUserQuery = `
  SELECT
    *
  FROM
    user
  WHERE
    username = '${username}';
  `;
  const user = await database.get(getUserQuery);
  return user;
};

//result
const getUserResult = (marks) => {
  const passResult = marks > 70 ? "pass" : "fail";
  return passResult;
};

//status
const convertDbToResponse = (each) => {
  return {
    name: each.name,
    marks: each.marks,
  };
};

//statusList
const statusList = ["COMPLETED", "IN PROGRESS"];

//**VISITOR POINT OF VIEW**//

//API-1(Available Courses)
app.get("/home/courses/", async (request, response) => {
  const availableCoursesQuery = `
    SELECT 
    course_name
    FROM
    courses;
    `;
  const coursesArray = await database.all(availableCoursesQuery);
  response.send(coursesArray);
});

//API-2(details of particular course)
app.get("/home/courses/:courseId/", async (request, response) => {
  const { courseId } = request.params;
  const detailedCourseQuery = `
    SELECT 
    courses.course_name,courses.course_description,courses.price,user.name AS Tutor
    FROM
    courses INNER JOIN user ON courses.user_id=user.user_id
    WHERE 
    courses.course_id=${courseId};
    `;
  const course = await database.get(detailedCourseQuery);
  response.send(course);
});

//**USER**//

//API-3(Dashboard-subscribed course)
app.get("/dashboard/", authenticateToken, async (request, response) => {
  const { username } = request;
  const user = await getUser(username);
  const { course_id } = user;
  const courseEnrolledQuery = `
    SELECT 
    course_name,course_description
    FROM
    courses 
    WHERE 
    course_id='${course_id}';`;

  const course = await database.get(courseEnrolledQuery);
  response.send(course);
});

//API-4(user taken course subjects)
app.get(
  "/dashboard/:courseId/subjects/",
  authenticateToken,
  async (request, response) => {
    const { username } = request;
    const { courseId } = request.params;
    const Id = parseInt(courseId);
    const user = await getUser(username);
    const { course_id } = user;
    if (Id == course_id) {
      const courseSubjectsQuery = `
    SELECT 
    subject_name
    FROM
    course_session_details 
    WHERE 
    course_id='${course_id}';`;

      const subjectsArray = await database.all(courseSubjectsQuery);
      response.send(subjectsArray);
    } else {
      response.status(400);
      response.send("You have not subscribed to this course.");
    }
  }
);

//API-5(accessing a single subject and video from user taken course)
app.get(
  "/dashboard/:courseId/subjects/:subjectId/",
  authenticateToken,
  async (request, response) => {
    const { username } = request;
    const { courseId, subjectId } = request.params;
    const Id = parseInt(courseId);
    const user = await getUser(username);
    const { course_id } = user;
    if (Id === course_id) {
      const subjectQuery = `
    SELECT 
    subject_name,video
    FROM
    course_session_details 
    WHERE 
    course_id='${course_id}' and subject_id='${subjectId}';`;

      const subject = await database.all(subjectQuery);
      response.send(subject);
    } else {
      response.status(400);
      response.send("You have not subscribed to this course.");
    }
  }
);

//API-6(accessing a single subject material from user taken course)
app.get(
  "/dashboard/:courseId/subjects/:subjectId/:materialId",
  authenticateToken,
  async (request, response) => {
    const { username } = request;
    const { courseId, subjectId, materialId } = request.params;
    const Id = parseInt(courseId);
    const user = await getUser(username);
    const { course_id } = user;
    if (Id === course_id) {
      const subjectQuery = `
    SELECT 
    topic,material
    FROM
    course_session_details NATURAL JOIN materials
    WHERE 
    course_id='${course_id}' and subject_id='${subjectId}' and material_id='${materialId}';`;

      const subject = await database.get(subjectQuery);
      response.send(subject);
    } else {
      response.status(400);
      response.send("You have not subscribed to this course.");
    }
  }
);

//API_7(Download certificate)
app.get(
  "/download_certificate/",
  authenticateToken,
  async (request, response) => {
    const { username } = request;
    const user = await getUser(username);
    const { user_id, name, role } = user;
    if (role === "student") {
      const getUserMarks = `
        SELECT
        marks,status 
        FROM
        tests
        WHERE user_id=${user_id};`;
      const results = await database.get(getUserMarks);
      const passStatus = await getUserResult(results.marks);
      if (results.status === "COMPLETED" && passStatus === "pass") {
        response.status(200);
        response.send(
          `Congratulations ${name}.We have mailed you the Certificate`
        );
      } else if (results.status === "COMPLETED" && passStatus === "fail") {
        response.status(200);
        response.send(
          `Sorry ${name}.Attempt the exam again and get a pass score to get the certificate`
        );
      } else {
        response.status(200);
        response.send(
          `Hi ${name}, complete course and take test to get the certificate.`
        );
      }
    }
  }
);

//**TUTOR**//

//API-8(get students w.r.t status)
app.get(
  "/learning_status/:courseId/",
  authenticateToken,
  authenticateRole,
  async (request, response) => {
    const { username } = request;
    const user = await getUser(username);
    const { course_id, name } = user;
    const { courseId } = request.params;
    const { status } = request.query;
    if (course_id == courseId) {
      if (status !== undefined && statusList.includes(`${status}`)) {
        getStudentsQuery = `
            SELECT
                user.name,tests.marks
            FROM
                user NATURAL JOIN tests 
            WHERE
                tests.status = '${status}' and tests.course_id=${course_id};`;
        const students = await database.all(getStudentsQuery);
        response.send(students.map((each) => convertDbToResponse(each)));
      } else {
        response.status(400);
        response.send("Invalid Status");
      }
    } else {
      response.status(400);
      response.send("You don't have access");
    }
  }
);

//API-9(Tutor to post material)

app.post(
  "/materials/add-material/",
  authenticateToken,
  authenticateRole,
  async (request, response) => {
    const { material_id, subject_id, topic, material } = request.body;
    const materialCheckQuery = `SELECT * FROM materials WHERE material_id=${material_id};`;
    const materialCheck = await database.get(materialCheckQuery);
    if (materialCheck !== undefined) {
      response.status(400);
      response.send("material already exits");
    } else {
      const postMaterialQuery = `
            INSERT INTO
              materials (material_id,subject_id,topic,material) 
              VALUES (
                  '${material_id}',
                  '${subject_id}',
                  '${topic}',
                  '${material}'
              );
            `;

      await database.run(postMaterialQuery);
      response.status(200);
      response.send("material added successfully");
    }
  }
);

//API-10(Tutor to post session)

app.post(
  "/materials/add-session/",
  authenticateToken,
  authenticateRole,
  async (request, response) => {
    const { subject_id, course_id, video, subject_name } = request.body;
    const sessionCheckQuery = `SELECT * FROM course_session_details WHERE subject_id=${subject_id};`;
    const sessionCheck = await database.get(sessionCheckQuery);
    if (sessionCheck !== undefined) {
      response.status(400);
      response.send("session already exits");
    } else {
      const postSessionQuery = `
            INSERT INTO
              course_session_details (subject_id, course_id, video, subject_name) 
              VALUES (
                  '${subject_id}',
                  '${course_id}',
                  '${video}',
                  '${subject_name}'
              );
            `;

      await database.run(postSessionQuery);
      response.status(200);
      response.send("session added successfully");
    }
  }
);

//API-11(Total students for a course)

app.get(
  "/courses/:courseId/students/",
  authenticateToken,
  authenticateRole,
  async (request, response) => {
    const { courseId } = request.params;
    const totalStudentsQuery = `
    SELECT 
    courses.course_name,count(${courseId}) AS Total_Students
    FROM
    user INNER JOIN courses ON user.course_id=courses.course_id
    WHERE 
    user.course_id=${courseId} and user.role="student";
    `;
    const students = await database.all(totalStudentsQuery);
    response.send(students);
  }
);

//API-12(delete Material)
app.delete(
  "/delete-material/:material_id/",
  authenticateToken,
  authenticateRole,
  async (request, response) => {
    const { material_id } = request.params;
    const getMaterialQuery = `
    SELECT
        *
    FROM
        materials
    WHERE
        material_id = '${material_id}';
    `;
    const materialCheck = await database.get(getMaterialQuery);
    if (materialCheck !== undefined) {
      const deleteMaterialQuery = `
    DELETE FROM
    materials
    WHERE material_id=${material_id};`;
      await database.run(deleteMaterialQuery);
      response.status(200);
      response.send("Material deleted");
    } else {
      response.status(400);
      response.send("Material doesn't exist");
    }
  }
);

module.exports = app;
