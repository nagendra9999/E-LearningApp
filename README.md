## E-LEARNING APP

# tables

**user**

| Column    | Type    |
| --------- | ------- |
| user_id   | INTEGER |
| name      | TEXT    |
| username  | TEXT    |
| password  | TEXT    |
| role      | TEXT    |
| course_id | INTEGER |

**courses**

| Column             | Type    |
| ------------------ | ------- |
| course_id          | INTEGER |
| tutor_id           | INTEGER |
| course_name        | TEXT    |
| course_description | TEXT    |
| price              | INTEGER |
| user_id            | INTEGER |

**course_session_details**

| Column       | Type    |
| ------------ | ------- |
| subject_id   | INTEGER |
| course_id    | INTEGER |
| video        | TEXT    |
| subject_name | TEXT    |

**materials_details**

| Column      | Type    |
| ----------- | ------- |
| material_id | INTEGER |
| subject_id  | INTEGER |
| topic       | TEXT    |
| material    | TEXT    |

**tests**

| Column    | Type    |
| --------- | ------- |
| test_id   | INTEGER |
| user_id   | INTEGER |
| course_id | INTEGER |
| marks     | INTEGER |
| status    | TEXT    |

# APIs

->register user API(path="/register/")

->login API(path="/login/")

**Visitor-point-of-view**

1. Available Courses
   (path="/home/courses/")

2. details of particular course
   (path="/home/courses/:courseId/")

**User**

3. Dashboard-subscribed course
   (path="/dashboard/")

4. user taken course subjects
   (path="/dashboard/:courseId/subjects/")

5. accessing a single subject and video from user taken course
   (path="/dashboard/:courseId/subjects/:subjectId/")

6. accessing a single subject material from user taken course
   (path="/dashboard/:courseId/subjects/:subjectId/:materialId")

7. Download certificate
   (path="/download_certificate/")

**Tutor**

8. get students w.r.t status
   (path="/learning_status/:courseId/")

9. Tutor to post material
   (path=/materials/add-material/)

10. Tutor to post session
    (path=/materials/add-session/)

11. Total students for a course
    (path="/courses/:courseId/students/")
