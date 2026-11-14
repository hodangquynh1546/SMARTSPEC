import logger from "../../../../../lib/logger";
// features/uml/domain/uml.socket.service.ts
import { io } from '../../../socket';

export interface UmlProgressEvent {
    type: 'UML_PROGRESS';
    projectId: string;
    versionId: string;
    userId: string;
    diagramType?: 'usecase' | 'activity' | 'sequence';
    progress?: number;
    stage?: string;
    isProcessing?: boolean;
    errors?: string[];
    errorMessage?: string;
    timestamp: Date;
}

export class UmlSocketService {
    /**
     * Gửi event đến tất cả thành viên trong project
     */
    broadcastToProject(projectId: string, event: UmlProgressEvent): void {
        io.to(`project_${projectId}`).emit('uml_event', event);
        logger.info(`📢 Broadcast uml event to project ${projectId}:`, event.type);
    }

    /**
     * Emit progress event
     */
    emitProgress(
        projectId: string,
        versionId: string,
        userId: string,
        diagramType: 'usecase' | 'activity' | 'sequence',
        progress: number,
        stage: string,
        isProcessing: boolean,
        errors?: string[]
    ): void {
        const event: UmlProgressEvent = {
            type: 'UML_PROGRESS',
            projectId,
            versionId,
            userId,
            diagramType,
            progress,
            stage,
            isProcessing,
            errors,
            errorMessage: errors && errors.length > 0 ? errors.join('; ') : undefined,
            timestamp: new Date()
        };
        this.broadcastToProject(projectId, event);
        if (errors && errors.length > 0) {
            logger.info(`❌ Broadcast uml failed (${diagramType}): ${progress}% - ${stage}`, errors);
        } else {
            logger.info(`📊 Broadcast uml progress (${diagramType}): ${progress}% - ${stage}`);
        }
    }
}

export const umlSocketService = new UmlSocketService();


