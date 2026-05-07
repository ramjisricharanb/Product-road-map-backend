CREATE TABLE TASKS (
  id VARCHAR2(100) PRIMARY KEY,
  platform VARCHAR2(200) NOT NULL,
  module_name VARCHAR2(300) NOT NULL,
  owners VARCHAR2(500) NOT NULL,
  priority VARCHAR2(50) NOT NULL,
  category_type VARCHAR2(100),
  status VARCHAR2(100) NOT NULL,
  percent_completed NUMBER(3),
  start_date DATE,
  completed_date DATE,
  description CLOB,
  technical_team VARCHAR2(500) NOT NULL,
  comments CLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
