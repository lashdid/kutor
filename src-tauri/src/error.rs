use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum KutorError {
    #[error("Process not found: {0}")]
    ProcessNotFound(String),

    #[error("Process is already running: {0}")]
    ProcessAlreadyRunning(String),

    #[error("Process is not running: {0}")]
    ProcessNotRunning(String),

    #[error("Failed to spawn process: {0}")]
    SpawnFailed(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

impl From<std::io::Error> for KutorError {
    fn from(err: std::io::Error) -> Self {
        KutorError::IoError(err.to_string())
    }
}

impl From<serde_json::Error> for KutorError {
    fn from(err: serde_json::Error) -> Self {
        KutorError::SerializationError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = KutorError::ProcessNotFound("test-id".to_string());
        assert_eq!(err.to_string(), "Process not found: test-id");
    }

    #[test]
    fn test_error_serialization() {
        let err = KutorError::ProcessNotFound("test-id".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("ProcessNotFound"));
    }
}
