package logger

import (
	"log"
	"os"
)

var (
	InfoLog  *log.Logger
	WarnLog  *log.Logger
	ErrorLog *log.Logger
)

func Init(level string) {
	InfoLog = log.New(os.Stdout, "[INFO] ", log.Ldate|log.Ltime|log.Lshortfile)
	WarnLog = log.New(os.Stdout, "[WARN] ", log.Ldate|log.Ltime|log.Lshortfile)
	ErrorLog = log.New(os.Stderr, "[ERROR] ", log.Ldate|log.Ltime|log.Lshortfile)
}

func Info(format string, v ...interface{}) {
	if InfoLog != nil {
		InfoLog.Printf(format, v...)
	}
}

func Warn(format string, v ...interface{}) {
	if WarnLog != nil {
		WarnLog.Printf(format, v...)
	}
}

func Error(format string, v ...interface{}) {
	if ErrorLog != nil {
		ErrorLog.Printf(format, v...)
	}
}
