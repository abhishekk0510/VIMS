package com.vims.controller;

import com.vims.dto.request.InvoiceRequests.*;
import com.vims.dto.response.Responses.*;
import com.vims.service.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/workflows")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WorkflowDto>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getAllWorkflows()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<WorkflowDto>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.getActiveWorkflow()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WorkflowDto>> create(
            @Valid @RequestBody CreateWorkflowRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.createWorkflow(req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkflowDto>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateWorkflowRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.updateWorkflow(id, req)));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<WorkflowDto>> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(workflowService.activateWorkflow(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        workflowService.deleteWorkflow(id);
        return ResponseEntity.ok(ApiResponse.ok("Workflow deleted", null));
    }
}
