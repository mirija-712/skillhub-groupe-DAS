<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * Enregistre les événements importants pour l'historisation (CDC : MongoDB activity_logs).
 * Si MONGODB_URI est configuré, pourrait écrire dans une collection MongoDB.
 * Par défaut, écrit dans le log Laravel au format structuré.
 */
class ActivityLogService
{
    public function logCourseEnrollment(int $userId, int $courseId): void
    {
        $this->log([
            'event' => 'course_enrollment',
            'user_id' => $userId,
            'course_id' => $courseId,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function logCourseCreation(int $courseId, int $createdBy): void
    {
        $this->log([
            'event' => 'course_creation',
            'course_id' => $courseId,
            'created_by' => $createdBy,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function logCourseUpdate(int $courseId, int $updatedBy, array $oldValues, array $newValues): void
    {
        $this->log([
            'event' => 'course_update',
            'course_id' => $courseId,
            'updated_by' => $updatedBy,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function logCourseDeletion(int $courseId, int $deletedBy): void
    {
        $this->log([
            'event' => 'course_deletion',
            'course_id' => $courseId,
            'deleted_by' => $deletedBy,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    private function log(array $payload): void
    {
        Log::channel('single')->info('activity_log', $payload);
    }
}
