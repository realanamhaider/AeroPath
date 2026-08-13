import { useState } from "react";
import { COURSE_CATALOG } from "../data/courseCatalog";

function CoursePicker({
  title,
  courses,
  onChange,
}) {
  const [selectedCourse, setSelectedCourse] =
    useState("");

  const [courseNumber, setCourseNumber] =
    useState("");

  const [showCustom, setShowCustom] =
    useState(false);

  const [customCourse, setCustomCourse] =
    useState("");

  const [customNumber, setCustomNumber] =
    useState("");

  const [error, setError] = useState("");

  function addCourse({
    name,
    number,
    custom = false,
  }) {
    const cleanName = name.trim();
    const cleanNumber = number.trim();

    if (!cleanName) {
      setError("Choose or enter a course.");
      return;
    }

    if (!cleanNumber) {
      setError("Enter the course number.");
      return;
    }

    const duplicate = courses.some(
      (course) =>
        course.name.toLowerCase() ===
          cleanName.toLowerCase() &&
        course.number.toLowerCase() ===
          cleanNumber.toLowerCase()
    );

    if (duplicate) {
      setError(
        "That course is already in your record."
      );
      return;
    }

    onChange([
      ...courses,
      {
        name: cleanName,
        number: cleanNumber,
        custom,
      },
    ]);

    setError("");
  }

  function addCatalogCourse() {
    addCourse({
      name: selectedCourse,
      number: courseNumber,
    });

    if (selectedCourse && courseNumber) {
      setSelectedCourse("");
      setCourseNumber("");
    }
  }

  function addCustomCourse() {
    addCourse({
      name: customCourse,
      number: customNumber,
      custom: true,
    });

    if (customCourse && customNumber) {
      setCustomCourse("");
      setCustomNumber("");
      setShowCustom(false);
    }
  }

  function removeCourse(index) {
    onChange(
      courses.filter(
        (_, courseIndex) =>
          courseIndex !== index
      )
    );
  }

  function updateCourseNumber(
    index,
    newNumber
  ) {
    onChange(
      courses.map((course, courseIndex) =>
        courseIndex === index
          ? {
              ...course,
              number: newNumber,
            }
          : course
      )
    );
  }

  return (
    <div className="course-picker">
      <div className="course-picker-heading">
        <div>
          <p className="card-label">
            COURSEWORK
          </p>

          <h3>{title}</h3>
        </div>

        <span>
          {courses.length}{" "}
          {courses.length === 1
            ? "course"
            : "courses"}
        </span>
      </div>

      <div className="course-add-grid">
        <label>
          Course

          <select
            value={selectedCourse}
            onChange={(event) =>
              setSelectedCourse(
                event.target.value
              )
            }
          >
            <option value="">
              Select a course
            </option>

            {Object.entries(
              COURSE_CATALOG
            ).map(
              ([category, categoryCourses]) => (
                <optgroup
                  label={category}
                  key={category}
                >
                  {categoryCourses.map(
                    (course) => (
                      <option
                        value={course}
                        key={`${category}-${course}`}
                      >
                        {course}
                      </option>
                    )
                  )}
                </optgroup>
              )
            )}
          </select>
        </label>

        <label>
          Course number

          <input
            type="text"
            value={courseNumber}
            onChange={(event) =>
              setCourseNumber(
                event.target.value
              )
            }
            placeholder="250"
            maxLength={20}
          />
        </label>

        <button
          type="button"
          className="course-add-button"
          onClick={addCatalogCourse}
        >
          + Add Course
        </button>
      </div>

      <button
        type="button"
        className="course-not-listed-link"
        onClick={() => {
          setShowCustom(
            (current) => !current
          );

          setError("");
        }}
      >
        {showCustom
          ? "Close custom course entry"
          : "Course not listed?"}
      </button>

      {showCustom && (
        <div className="custom-course-panel">
          <div>
            <p className="card-label">
              UNLISTED COURSE
            </p>

            <h4>
              What class wasn't listed?
            </h4>
          </div>

          <div className="course-add-grid">
            <label>
              Course name

              <input
                type="text"
                value={customCourse}
                onChange={(event) =>
                  setCustomCourse(
                    event.target.value
                  )
                }
                placeholder="Computational Aerodynamics"
              />
            </label>

            <label>
              Course number

              <input
                type="text"
                value={customNumber}
                onChange={(event) =>
                  setCustomNumber(
                    event.target.value
                  )
                }
                placeholder="481"
                maxLength={20}
              />
            </label>

            <button
              type="button"
              className="course-add-button"
              onClick={addCustomCourse}
            >
              + Add Unlisted Course
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="course-picker-error">
          {error}
        </p>
      )}

      {courses.length > 0 && (
        <div className="course-record-list">
          {courses.map((course, index) => (
            <div
              className="course-record-item"
              key={`${course.name}-${index}`}
            >
              <div className="course-record-name">
                <strong>
                  {course.name}
                </strong>

                <span>
                  {course.custom
                    ? "Custom course"
                    : "Catalog course"}
                </span>
              </div>

              <label>
                Course number

                <input
                  type="text"
                  value={course.number}
                  onChange={(event) =>
                    updateCourseNumber(
                      index,
                      event.target.value
                    )
                  }
                  placeholder="Required"
                />
              </label>

              <button
                type="button"
                className="course-remove-button"
                onClick={() =>
                  removeCourse(index)
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CoursePicker;